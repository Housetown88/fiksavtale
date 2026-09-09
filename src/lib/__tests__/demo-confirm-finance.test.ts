import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer, markWorkStarted } from "../domain";
import { canViewerSeeContact, getContactPayload } from "../contact";
import {
  confirmDemoPayment,
  createPaymentIntent,
  handlePaymentWebhook,
} from "../payments";
import { describeBookingMoney } from "../booking-totals";
import { LEDGER } from "../ledger";
import { demoIntentBadgeStatus, paymentConfirmView } from "../payment-status-ui";

let db: PrismaClient;
const snapshot = { VERCEL_ENV: process.env.VERCEL_ENV, ALLOW_DEMO_PAYMENTS: process.env.ALLOW_DEMO_PAYMENTS };

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

afterEach(() => {
  if (snapshot.VERCEL_ENV == null) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = snapshot.VERCEL_ENV;
  if (snapshot.ALLOW_DEMO_PAYMENTS == null) delete process.env.ALLOW_DEMO_PAYMENTS;
  else process.env.ALLOW_DEMO_PAYMENTS = snapshot.ALLOW_DEMO_PAYMENTS;
});

async function pendingBooking() {
  const users = await createTestUsers(db);
  const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
    title: "DEMO-finansiering",
    description: "Trenger belysning i stua.",
    category: "elektriker",
    subcategory: "elektriker.belysning",
    area: "Grünerløkka",
    addressLine: "Markveien 12",
  });
  const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
    jobId: job.id,
    amountOre: 250_000,
    message: "Kan starte torsdag. Fastpris inkludert materiell.",
  });
  const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
  const intent = await createPaymentIntent(db, booking.id);
  return { users, job, booking, intent };
}

describe("DEMO-bekreftelse finansierer bookingen", () => {
  it("return-URL alene låser ikke opp kontakt", async () => {
    const { users, job, booking, intent } = await pendingBooking();
    expect(intent.status).toBe("PENDING");
    expect(booking.status).toBe("PENDING_PAYMENT");
    const contact = await getContactPayload(db, { viewerId: users.provider.id, jobId: job.id });
    expect(contact.unlocked).toBe(false);
    const view = paymentConfirmView({
      bookingStatus: booking.status,
      intentStatus: intent.status,
      contactUnlocked: false,
    });
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(demoIntentBadgeStatus({
      intentStatus: intent.status,
      bookingStatus: booking.status,
      contactUnlocked: false,
    })).not.toBe("SUCCEEDED");
  });

  it("Bekreft DEMO-betaling setter PAID, låser opp kontakt og nuller rest", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ALLOW_DEMO_PAYMENTS;
    const { users, job, booking, intent } = await pendingBooking();
    expect(users.customer.email.endsWith("@demo.jobbenmin.no")).toBe(false);

    const blocked = await handlePaymentWebhook(db, {
      eventId: `webhook_block_${intent.id}`,
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    expect(blocked.ignored).toBe("prod_demo_blocked");
    const afterWebhook = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const afterWebhookIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    expect(afterWebhook.status).toBe("PENDING_PAYMENT");
    expect(afterWebhook.contactUnlockedAt).toBeNull();
    expect(afterWebhookIntent.status).toBe("PENDING");

    const result = await confirmDemoPayment(db, {
      eventId: `demo_confirm_${intent.id}`,
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });

    expect(result.ignored).toBeUndefined();
    expect(result.bookingStatus).toBe("PAID");
    expect(result.contactUnlocked).toBe(true);

    const after = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { extras: true, payments: true },
    });
    const paidIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    expect(paidIntent.status).toBe("SUCCEEDED");
    expect(after.status).toBe("PAID");
    expect(after.contactUnlockedAt).not.toBeNull();
    expect(after.payments.some((payment) => payment.status === "SUCCEEDED")).toBe(true);

    const money = describeBookingMoney({
      agreedOre: after.amountOre,
      extras: after.extras,
      platformFeeBps: after.platformFeeBps,
      status: after.status,
      refundedOre: after.refundedOre,
    });
    expect(money.remainingToPayOre).toBe(0);

    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(true);
    expect(await canViewerSeeContact(db, { viewerId: users.customer.id, jobId: job.id })).toBe(true);

    const started = await markWorkStarted(db, { id: users.provider.id, role: "PROVIDER" }, after.id);
    expect(started.status).toBe("IN_PROGRESS");

    const view = paymentConfirmView({
      bookingStatus: "PAID",
      intentStatus: "SUCCEEDED",
      contactUnlocked: true,
    });
    expect(view.title).toMatch(/bekreftet/i);
    expect(view.tone).toBe("ok");
  });

  it("feilet og avbrutt DEMO-bekreftelse holder kontakt låst", async () => {
    const failed = await pendingBooking();
    await confirmDemoPayment(db, {
      eventId: `demo_fail_${failed.intent.id}`,
      type: "payment.failed",
      paymentIntentId: failed.intent.id,
      bookingId: failed.booking.id,
    });
    const afterFail = await db.booking.findUniqueOrThrow({ where: { id: failed.booking.id } });
    expect(afterFail.status).toBe("PENDING_PAYMENT");
    expect(afterFail.contactUnlockedAt).toBeNull();
    expect(await canViewerSeeContact(db, { viewerId: failed.users.provider.id, jobId: failed.job.id })).toBe(false);

    const cancelled = await pendingBooking();
    await confirmDemoPayment(db, {
      eventId: `demo_cancel_${cancelled.intent.id}`,
      type: "payment.cancelled",
      paymentIntentId: cancelled.intent.id,
      bookingId: cancelled.booking.id,
    });
    const afterCancel = await db.booking.findUniqueOrThrow({ where: { id: cancelled.booking.id } });
    expect(afterCancel.status).toBe("PENDING_PAYMENT");
    expect(afterCancel.contactUnlockedAt).toBeNull();
    expect(await canViewerSeeContact(db, { viewerId: cancelled.users.provider.id, jobId: cancelled.job.id })).toBe(false);
  });

  it("reparerer gammel inkonsistens: intensjon SUCCEEDED uten PAID, uten dobbel provisjon", async () => {
    const { users, job, booking, intent } = await pendingBooking();
    await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "SUCCEEDED" } });
    await db.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        eventId: `stale_success_${intent.id}`,
        amountOre: intent.amountOre,
        status: "SUCCEEDED",
        rawPayload: JSON.stringify({ ignored: "stale_unfinanced_intent" }),
      },
    });
    await db.settlementEntry.create({
      data: {
        bookingId: booking.id,
        type: LEDGER.CHARGE,
        amountOre: intent.amountOre,
        eventId: `stale_charge_${intent.id}`,
      },
    });
    await db.settlementEntry.create({
      data: {
        bookingId: booking.id,
        type: LEDGER.COMMISSION,
        amountOre: 25_000,
        eventId: `stale_fee_${intent.id}`,
      },
    });

    const view = paymentConfirmView({
      bookingStatus: "PENDING_PAYMENT",
      intentStatus: "SUCCEEDED",
      contactUnlocked: false,
    });
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(view.tone).toBe("warn");
    expect(
      demoIntentBadgeStatus({
        intentStatus: "SUCCEEDED",
        bookingStatus: "PENDING_PAYMENT",
        contactUnlocked: false,
      }),
    ).not.toBe("SUCCEEDED");

    await confirmDemoPayment(db, {
      eventId: `demo_heal_${intent.id}`,
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("PAID");
    expect(after.contactUnlockedAt).not.toBeNull();
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(true);

    const charges = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.CHARGE, extraChargeId: null },
    });
    expect(charges).toHaveLength(1);
  });
});
