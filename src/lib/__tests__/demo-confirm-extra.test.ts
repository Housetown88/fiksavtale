import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import {
  acceptOffer,
  completeBooking,
  createJob,
  createOffer,
  decideExtra,
  markWorkStarted,
  proposeExtra,
} from "../domain";
import {
  applySucceededExtraFinance,
  confirmDemoPayment,
  createPaymentIntent,
  handlePaymentWebhook,
  repairUnpaidApprovedExtras,
} from "../payments";
import { describeBookingMoney } from "../booking-totals";
import { LEDGER } from "../ledger";
import { paymentConfirmView } from "../payment-status-ui";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function inProgressBookingWithApprovedExtra(amountOre = 150_000, extraOre = 20_000) {
  const users = await createTestUsers(db);
  const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
    title: "Tillegg DEMO",
    description: "Hovedjobb finansiert, deretter tillegg.",
    category: "elektriker",
    subcategory: "elektriker.belysning",
    area: "Grünerløkka",
    addressLine: "Markveien 12",
  });
  const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
    jobId: job.id,
    amountOre,
    message: "Fastpris inkludert materiell.",
  });
  const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
  const mainIntent = await createPaymentIntent(db, booking.id);
  await confirmDemoPayment(db, {
    eventId: `main_${mainIntent.id}`,
    type: "payment.succeeded",
    paymentIntentId: mainIntent.id,
    bookingId: booking.id,
  });
  await markWorkStarted(db, { id: users.provider.id, role: "PROVIDER" }, booking.id);
  const extra = await proposeExtra(db, { id: users.provider.id, role: "PROVIDER" }, {
    bookingId: booking.id,
    title: "Ekstra stikkontakt",
    amountOre: extraOre,
  });
  await decideExtra(db, { id: users.customer.id, role: "CUSTOMER" }, extra.id, "APPROVED");
  const extraIntent = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
  return {
    users,
    job,
    booking: await db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    extra: await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } }),
    extraIntent,
    mainIntent,
  };
}

describe("DEMO-bekreftelse av tillegg", () => {
  it("viser ikke suksess for finansiert booking med PENDING EXTRA-intensjon", async () => {
    const { booking, extra, extraIntent } = await inProgressBookingWithApprovedExtra();
    expect(booking.status).toBe("IN_PROGRESS");
    expect(booking.contactUnlockedAt).not.toBeNull();
    expect(extra.status).toBe("APPROVED");
    expect(extraIntent.status).toBe("PENDING");
    expect(extraIntent.kind).toBe("EXTRA");

    const view = paymentConfirmView({
      bookingStatus: booking.status,
      intentStatus: extraIntent.status,
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: extra.status,
      extraChargeId: extra.id,
      intentKind: extraIntent.kind,
    });
    expect(view.tone).not.toBe("ok");
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(view.showSimulate).toBe(true);
    expect(view.title).not.toMatch(/^Betalingen er bekreftet$/);
  });

  it("Bekreft DEMO-betaling merker tillegg PAID, bokfører og låser opp fullføring", async () => {
    const { users, booking, extra, extraIntent, mainIntent } = await inProgressBookingWithApprovedExtra();
    await expect(
      completeBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id),
    ).rejects.toThrow(/betales/);

    const result = await confirmDemoPayment(db, {
      eventId: `extra_confirm_${extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: extraIntent.id,
      bookingId: booking.id,
    });
    expect(result.bookingStatus).toBe("IN_PROGRESS");
    expect(result.contactUnlocked).toBe(true);

    const paidExtra = await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } });
    const paidIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } });
    const after = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { extras: true },
    });
    expect(paidExtra.status).toBe("PAID");
    expect(paidIntent.status).toBe("SUCCEEDED");
    expect(after.amountOre).toBe(150_000);
    expect(after.status).toBe("IN_PROGRESS");

    const money = describeBookingMoney({
      agreedOre: after.amountOre,
      extras: after.extras,
      platformFeeBps: after.platformFeeBps,
      status: after.status,
      refundedOre: after.refundedOre,
    });
    expect(money.fundedOre).toBe(170_000);
    expect(money.feeOnFundedOre).toBe(17_000);
    expect(money.remainingToPayOre).toBe(0);
    expect(after.platformFeeOre).toBe(17_000);

    const extraCharges = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.EXTRA_CHARGE, extraChargeId: extra.id },
    });
    const extraFees = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.EXTRA_COMMISSION, extraChargeId: extra.id },
    });
    const mainCharges = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.CHARGE, extraChargeId: null },
    });
    expect(extraCharges).toHaveLength(1);
    expect(extraCharges[0]?.amountOre).toBe(20_000);
    expect(extraFees).toHaveLength(1);
    expect(extraFees[0]?.amountOre).toBe(2_000);
    expect(mainCharges).toHaveLength(1);
    expect(mainCharges[0]?.amountOre).toBe(150_000);

    const mainAfter = await db.paymentIntent.findUniqueOrThrow({ where: { id: mainIntent.id } });
    expect(mainAfter.status).toBe("SUCCEEDED");

    await completeBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id);
    const done = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(done.status).toBe("COMPLETED");
    expect(done.amountOre).toBe(150_000);
  });

  it("feilet og avbrutt tillegg forblir ubetalt uten å endre hovedfinansiering", async () => {
    const failed = await inProgressBookingWithApprovedExtra();
    await confirmDemoPayment(db, {
      eventId: `extra_fail_${failed.extraIntent.id}`,
      type: "payment.failed",
      paymentIntentId: failed.extraIntent.id,
      bookingId: failed.booking.id,
    });
    const afterFail = await db.extraCharge.findUniqueOrThrow({ where: { id: failed.extra.id } });
    const failIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: failed.extraIntent.id } });
    const failBooking = await db.booking.findUniqueOrThrow({ where: { id: failed.booking.id } });
    expect(afterFail.status).toBe("APPROVED");
    expect(failIntent.status).toBe("FAILED");
    expect(failBooking.status).toBe("IN_PROGRESS");
    expect(failBooking.amountOre).toBe(150_000);
    expect(failBooking.platformFeeOre).toBe(15_000);

    const cancelled = await inProgressBookingWithApprovedExtra();
    await confirmDemoPayment(db, {
      eventId: `extra_cancel_${cancelled.extraIntent.id}`,
      type: "payment.cancelled",
      paymentIntentId: cancelled.extraIntent.id,
      bookingId: cancelled.booking.id,
    });
    const afterCancel = await db.extraCharge.findUniqueOrThrow({ where: { id: cancelled.extra.id } });
    const cancelIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: cancelled.extraIntent.id } });
    expect(afterCancel.status).toBe("APPROVED");
    expect(cancelIntent.status).toBe("CANCELLED");
    expect((await db.booking.findUniqueOrThrow({ where: { id: cancelled.booking.id } })).status).toBe("IN_PROGRESS");
  });

  it("er idempotent og dobler ikke tilleggsprovisjon", async () => {
    const { booking, extra, extraIntent } = await inProgressBookingWithApprovedExtra();
    await confirmDemoPayment(db, {
      eventId: `extra_once_${extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: extraIntent.id,
      bookingId: booking.id,
    });
    await applySucceededExtraFinance(db, booking.id, extraIntent.id);
    const charges = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.EXTRA_CHARGE, extraChargeId: extra.id },
    });
    expect(charges).toHaveLength(1);
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } })).status).toBe("PAID");
  });

  it("webhook for tillegg finansierer også ExtraCharge", async () => {
    const { booking, extra, extraIntent } = await inProgressBookingWithApprovedExtra();
    await handlePaymentWebhook(db, {
      eventId: `extra_hook_${extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: extraIntent.id,
      bookingId: booking.id,
    });
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } })).status).toBe("PAID");
    expect((await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } })).status).toBe("SUCCEEDED");
  });

  it("repairUnpaidApprovedExtras treffer SUCCEEDED EXTRA uten å auto-betale PENDING", async () => {
    const stuck = await inProgressBookingWithApprovedExtra();
    await db.paymentIntent.update({
      where: { id: stuck.extraIntent.id },
      data: { status: "SUCCEEDED" },
    });
    const pendingOnly = await inProgressBookingWithApprovedExtra();

    const repaired = await repairUnpaidApprovedExtras(db);
    expect(repaired.extraChargeIds).toContain(stuck.extra.id);
    expect(repaired.extraChargeIds).not.toContain(pendingOnly.extra.id);

    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: stuck.extra.id } })).status).toBe("PAID");
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: pendingOnly.extra.id } })).status).toBe("APPROVED");

    const afterConfirm = await confirmDemoPayment(db, {
      eventId: `pending_repair_${pendingOnly.extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: pendingOnly.extraIntent.id,
      bookingId: pendingOnly.booking.id,
    });
    expect(afterConfirm.bookingStatus).toBe("IN_PROGRESS");
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: pendingOnly.extra.id } })).status).toBe("PAID");
  });
});
