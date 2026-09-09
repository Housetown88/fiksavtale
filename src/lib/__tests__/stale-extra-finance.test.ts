import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import {
  acceptOffer,
  cancelBooking,
  createJob,
  createOffer,
  decideExtra,
  markWorkStarted,
  proposeExtra,
} from "../domain";
import {
  confirmDemoPayment,
  createPaymentIntent,
  handlePaymentWebhook,
} from "../payments";
import { LEDGER, ledgerSnapshot } from "../ledger";
import { describeBookingMoney } from "../booking-totals";
import { paymentConfirmView } from "../payment-status-ui";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function inProgressWithPendingExtra(amountOre = 170_000, extraOre = 30_000) {
  const users = await createTestUsers(db);
  const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
    title: "Stale EXTRA",
    description: "Hovedjobb finansiert, deretter tillegg uten bekreftelse.",
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
  const extra = await proposeExtra(db, { id: users.provider.id, role: "PROVIDER" }, {
    bookingId: booking.id,
    title: "Ekstra arbeid",
    amountOre: extraOre,
  });
  await decideExtra(db, { id: users.customer.id, role: "CUSTOMER" }, extra.id, "APPROVED");
  const extraIntent = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
  return {
    users,
    booking: await db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    extra: await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } }),
    extraIntent,
  };
}

describe("stale EXTRA-bekreftelse etter avbestilling", () => {
  it("avbestilling før start kansellerer ventende intensjoner", async () => {
    const { users, booking, extraIntent } = await inProgressWithPendingExtra();
    expect(booking.status).toBe("PAID");
    expect(extraIntent.status).toBe("PENDING");

    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Avbestilt før start");
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const intent = await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } });
    expect(after.status).toBe("REFUNDED");
    expect(intent.status).toBe("CANCELLED");
  });

  it("avviser DEMO-bekreftelse av PENDING EXTRA etter REFUNDED uten ny finansiering eller provisjon", async () => {
    const { users, booking, extra, extraIntent } = await inProgressWithPendingExtra();
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Avbestilt før start");

    const before = await ledgerSnapshot(db, booking.id);
    await expect(
      confirmDemoPayment(db, {
        eventId: `stale_refund_${extraIntent.id}`,
        type: "payment.succeeded",
        paymentIntentId: extraIntent.id,
        bookingId: booking.id,
      }),
    ).rejects.toThrow(/refundert/i);

    const afterBooking = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { extras: true },
    });
    const afterExtra = await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } });
    const afterIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } });
    const after = await ledgerSnapshot(db, booking.id);
    expect(afterBooking.status).toBe("REFUNDED");
    expect(afterExtra.status).toBe("APPROVED");
    expect(afterIntent.status).toBe("CANCELLED");
    expect(after.charged).toBe(before.charged);
    expect(after.commissionNet).toBe(before.commissionNet);
    expect(afterBooking.refundedOre).toBe(170_000);

    const money = describeBookingMoney({
      agreedOre: afterBooking.amountOre,
      extras: afterBooking.extras,
      platformFeeBps: afterBooking.platformFeeBps,
      status: afterBooking.status,
      refundedOre: afterBooking.refundedOre,
    });
    expect(money.financedOre).toBe(170_000);
    expect(money.extrasPaidOre).toBe(0);
    expect(money.inconsistentUnpaidApproved).toBe(false);

    const view = paymentConfirmView({
      bookingStatus: afterBooking.status,
      intentStatus: afterIntent.status,
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: afterExtra.status,
      intentKind: "EXTRA",
    });
    expect(view.showSimulate).toBe(false);
    expect(view.showRetry).toBe(false);
    expect(view.title).toMatch(/refundert/i);
  });

  it("avbestilling etter start kansellerer ventende intensjoner og åpner tvist", async () => {
    const { users, booking, extraIntent } = await inProgressWithPendingExtra();
    await markWorkStarted(db, { id: users.provider.id, role: "PROVIDER" }, booking.id);
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Stopp etter start");

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const intent = await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } });
    expect(after.status).toBe("DISPUTED");
    expect(intent.status).toBe("CANCELLED");
    const hold = await db.settlementEntry.findFirst({
      where: { bookingId: booking.id, type: LEDGER.DISPUTE_HOLD },
    });
    expect(hold?.amountOre).toBe(170_000);
  });

  it("avviser DEMO-bekreftelse av PENDING EXTRA etter DISPUTED uten ny finansiering eller provisjon", async () => {
    const { users, booking, extra, extraIntent } = await inProgressWithPendingExtra();
    await markWorkStarted(db, { id: users.provider.id, role: "PROVIDER" }, booking.id);
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Stopp etter start");

    const before = await ledgerSnapshot(db, booking.id);
    await expect(
      confirmDemoPayment(db, {
        eventId: `stale_dispute_${extraIntent.id}`,
        type: "payment.succeeded",
        paymentIntentId: extraIntent.id,
        bookingId: booking.id,
      }),
    ).rejects.toThrow(/tvist/i);

    const afterBooking = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { extras: true },
    });
    const afterExtra = await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } });
    const afterIntent = await db.paymentIntent.findUniqueOrThrow({ where: { id: extraIntent.id } });
    const after = await ledgerSnapshot(db, booking.id);
    expect(afterBooking.status).toBe("DISPUTED");
    expect(afterExtra.status).toBe("APPROVED");
    expect(afterIntent.status).toBe("CANCELLED");
    expect(after.charged).toBe(before.charged);
    expect(after.commissionNet).toBe(before.commissionNet);
    expect(afterBooking.refundedOre).toBe(0);

    const extraCharges = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.EXTRA_CHARGE },
    });
    expect(extraCharges).toHaveLength(0);

    const view = paymentConfirmView({
      bookingStatus: afterBooking.status,
      intentStatus: afterIntent.status,
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: afterExtra.status,
      intentKind: "EXTRA",
    });
    expect(view.showSimulate).toBe(false);
    expect(view.title).toMatch(/tvist/i);
  });

  it("ignorerer late webhook for PENDING EXTRA på lukket booking uten å bokføre provisjon", async () => {
    const { users, booking, extra, extraIntent } = await inProgressWithPendingExtra();
    await cancelBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id, "Avbestilt før start");

    const result = await handlePaymentWebhook(db, {
      eventId: `late_vipps_${extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: extraIntent.id,
      bookingId: booking.id,
    });
    expect(result.ignored).toBe("booking_closed");
    expect(result.bookingStatus).toBe("REFUNDED");
    expect((await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } })).status).toBe("APPROVED");
    const extraFees = await db.settlementEntry.findMany({
      where: { bookingId: booking.id, type: LEDGER.EXTRA_COMMISSION },
    });
    expect(extraFees).toHaveLength(0);
  });
});
