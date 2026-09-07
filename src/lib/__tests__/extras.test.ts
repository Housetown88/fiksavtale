import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import {
  acceptOffer,
  completeBooking,
  createJob,
  createOffer,
  decideExtra,
  proposeExtra,
} from "../domain";
import { createPaymentIntent, handlePaymentWebhook } from "../payments";
import { extraImpact, summarizeBookingMoney } from "../booking-totals";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function paidBooking() {
  const users = await createTestUsers(db);
  const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
    title: "Ekstra test",
    description: "Trenger mer arbeid.",
    category: "elektriker",
    area: "Tøyen",
  });
  const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
    jobId: job.id,
    amountOre: 150_000,
    message: "Fastpris uten tillegg.",
  });
  const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
  const intent = await createPaymentIntent(db, booking.id);
  await handlePaymentWebhook(db, {
    eventId: `extra_setup_${intent.id}`,
    type: "payment.succeeded",
    paymentIntentId: intent.id,
    bookingId: booking.id,
  });
  return { users, booking: await db.booking.findUniqueOrThrow({ where: { id: booking.id } }) };
}

describe("tillegg", () => {
  it("viser gebyr og ny total uten å endre bookingen ved godkjenning", () => {
    const impact = extraImpact({
      agreedOre: 150_000,
      extras: [],
      extraAmountOre: 20_000,
      platformFeeBps: 1000,
    });
    expect(impact.extraFeeOre).toBe(2_000);
    expect(impact.combinedOre).toBe(170_000);
  });

  it("krever betaling før tillegg teller som finansiert og før fullføring", async () => {
    const { users, booking } = await paidBooking();
    const extra = await proposeExtra(db, { id: users.provider.id, role: "PROVIDER" }, {
      bookingId: booking.id,
      title: "Ekstra stikkontakt",
      amountOre: 20_000,
    });
    await decideExtra(db, { id: users.customer.id, role: "CUSTOMER" }, extra.id, "APPROVED");
    const afterApprove = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { extras: true },
    });
    expect(afterApprove.amountOre).toBe(150_000);
    expect(afterApprove.extras[0]?.status).toBe("APPROVED");
    const summary = summarizeBookingMoney(afterApprove.amountOre, afterApprove.extras, afterApprove.platformFeeBps);
    expect(summary.fundedOre).toBe(150_000);
    expect(summary.unpaidApprovedCount).toBe(1);

    await expect(
      completeBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id),
    ).rejects.toThrow(/betales/);

    const extraIntent = await createPaymentIntent(db, booking.id, { extraChargeId: extra.id });
    await handlePaymentWebhook(db, {
      eventId: `extra_pay_${extraIntent.id}`,
      type: "payment.succeeded",
      paymentIntentId: extraIntent.id,
      bookingId: booking.id,
    });
    const paidExtra = await db.extraCharge.findUniqueOrThrow({ where: { id: extra.id } });
    expect(paidExtra.status).toBe("PAID");
    const funded = summarizeBookingMoney(afterApprove.amountOre, [paidExtra], afterApprove.platformFeeBps);
    expect(funded.fundedOre).toBe(170_000);

    await completeBooking(db, { id: users.customer.id, role: "CUSTOMER" }, booking.id);
    const done = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(done.status).toBe("COMPLETED");
    expect(done.amountOre).toBe(150_000);
  });
});
