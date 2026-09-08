import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import {
  acceptOffer,
  applyApprovalTimeout,
  cancelBooking,
  completeBooking,
  createJob,
  createOffer,
  decideExtra,
  markWorkStarted,
  proposeExtra,
} from "../domain";
import { createPaymentIntent, expireStalePaymentIntents, handlePaymentWebhook, refundBooking } from "../payments";
import { LEDGER, ledgerSnapshot } from "../ledger";
import { canViewerSeeContact } from "../contact";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function bookedJob(amountOre = 150_000) {
  const users = await createTestUsers(db);
  const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
    title: "Oppgjørsjobb",
    description: "Test av provisjon.",
    category: "elektriker",
    area: "Tøyen",
  });
  const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
    jobId: job.id,
    amountOre,
    message: "Fastpris uten kontaktinfo.",
  });
  const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
  return { users, job, booking };
}

async function pay(bookingId: string, suffix: string) {
  const intent = await createPaymentIntent(db, bookingId);
  await handlePaymentWebhook(db, {
    eventId: `pay_${suffix}`,
    type: "payment.succeeded",
    paymentIntentId: intent.id,
    bookingId,
  });
  return intent;
}

describe("oppgjørsbok og avbestilling", () => {
  it("registrerer provisjon automatisk ved finansiering", async () => {
    const { booking } = await bookedJob(200_000);
    await pay(booking.id, `main_${booking.id}`);
    const snap = await ledgerSnapshot(db, booking.id);
    expect(snap.charged).toBe(200_000);
    expect(snap.commissionNet).toBe(20_000);
    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.platformFeeOre).toBe(20_000);
    expect(updated.providerPayoutOre).toBe(180_000);
  });

  it("avbestiller før betaling uten refusjon", async () => {
    const { users, booking } = await bookedJob();
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Ombestemt");
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.refundedOre).toBe(0);
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: after.jobId })).toBe(false);
  });

  it("refunderer etter betaling og justerer gebyr", async () => {
    const { users, booking } = await bookedJob(100_000);
    await pay(booking.id, `refund_setup_${booking.id}`);
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Avbestilt etter betaling");
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("REFUNDED");
    expect(after.refundedOre).toBe(100_000);
    expect(after.platformFeeOre).toBe(0);
    const snap = await ledgerSnapshot(db, booking.id);
    expect(snap.refunded).toBe(100_000);
    expect(snap.commissionNet).toBe(0);
  });

  it("åpner tvist ved avbestilling etter start", async () => {
    const { users, booking } = await bookedJob();
    await pay(booking.id, `start_${booking.id}`);
    await markWorkStarted(db, { id: users.provider.id, role: "PROVIDER" }, booking.id);
    const disputed = await cancelBooking(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      booking.id,
      "Stopp etter start",
    );
    expect(disputed.status).toBe("DISPUTED");
    const hold = await db.settlementEntry.findFirst({
      where: { bookingId: booking.id, type: LEDGER.DISPUTE_HOLD },
    });
    expect(hold).toBeTruthy();
  });

  it("justerer gebyr ved delvis refusjon", async () => {
    const { booking } = await bookedJob(100_000);
    await pay(booking.id, `partial_${booking.id}`);
    await refundBooking(db, booking.id, 40_000, `partial_refund_${booking.id}`);
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.refundedOre).toBe(40_000);
    expect(after.platformFeeOre).toBe(6_000);
    expect(after.status).toBe("PAID");
  });

  it("håndterer feilet og avbrutt tillegg, deretter retry", async () => {
    const { users, booking } = await bookedJob();
    await pay(booking.id, `extra_base_${booking.id}`);
    const extra = await proposeExtra(db, { id: users.provider.id, role: "PROVIDER" }, {
      bookingId: booking.id,
      title: "Ekstra stikk",
      amountOre: 20_000,
    });
    await decideExtra(db, { id: users.customer.id, role: "CUSTOMER" }, extra.id, "APPROVED");
    const failIntent = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
    await handlePaymentWebhook(db, {
      eventId: `extra_fail_${failIntent.id}`,
      type: "payment.failed",
      paymentIntentId: failIntent.id,
      bookingId: booking.id,
    });
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } })).status).toBe("APPROVED");
    const cancelIntent = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
    await handlePaymentWebhook(db, {
      eventId: `extra_cancel_${cancelIntent.id}`,
      type: "payment.cancelled",
      paymentIntentId: cancelIntent.id,
      bookingId: booking.id,
    });
    const retry = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
    await handlePaymentWebhook(db, {
      eventId: `extra_ok_${retry.id}`,
      type: "payment.succeeded",
      paymentIntentId: retry.id,
      bookingId: booking.id,
    });
    const paid = await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } });
    expect(paid.status).toBe("PAID");
    const snap = await ledgerSnapshot(db, booking.id);
    expect(snap.charged).toBe(170_000);
    expect(snap.commissionNet).toBe(17_000);
    await completeBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id);
  });

  it("utløper reservasjon uten å låse opp kontakt", async () => {
    const { users, booking } = await bookedJob();
    const intent = await db.paymentIntent.create({
      data: {
        bookingId: booking.id,
        amountOre: booking.amountOre,
        status: "PENDING",
        kind: "RESERVATION",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await expireStalePaymentIntents(db);
    const expired = await db.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    expect(expired.status).toBe("EXPIRED");
    const late = await handlePaymentWebhook(db, {
      eventId: `late_${intent.id}`,
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    expect(late.ignored).toBe("expired_intent");
    expect(late.contactUnlocked).toBe(false);
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: booking.jobId })).toBe(false);
  });

  it("auto-godkjenner etter frist uten kundesvar", async () => {
    const { users, booking } = await bookedJob();
    await pay(booking.id, `timeout_${booking.id}`);
    await db.booking.update({
      where: { id: booking.id },
      data: { approvalDeadlineAt: new Date(Date.now() - 1000) },
    });
    await applyApprovalTimeout(db, booking.id);
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("COMPLETED");
    expect(after.payoutReleasedAt).toBeTruthy();
    expect(users.customer.id).toBeTruthy();
  });
});
