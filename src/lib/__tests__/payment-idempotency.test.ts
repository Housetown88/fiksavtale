import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";
import { createPaymentIntent, demoPaymentEventId, handlePaymentWebhook } from "../payments";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("betalingswebhook", () => {
  it("er idempotent og lager ikke dobbel booking eller dobbel utbetaling", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Installere downlights",
      description: "Fire stykker i stua.",
      category: "elektriker",
      area: "Majorstuen",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 500_000,
      message: "Inkludert materiell og festing.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    expect(booking.platformFeeOre).toBe(50_000);
    expect(booking.providerPayoutOre).toBe(450_000);

    const intent = await createPaymentIntent(db, booking.id);
    const event = {
      eventId: "evt_same",
      type: "payment.succeeded" as const,
      paymentIntentId: intent.id,
      bookingId: booking.id,
    };

    const first = await handlePaymentWebhook(db, event);
    const second = await handlePaymentWebhook(db, event);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(first.contactUnlocked).toBe(true);
    expect(second.contactUnlocked).toBe(true);

    const payments = await db.payment.findMany({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);

    const bookings = await db.booking.findMany({ where: { jobId: job.id } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.providerPayoutOre).toBe(450_000);
    expect(bookings[0]?.status).toBe("PAID");

    const third = await handlePaymentWebhook(db, {
      eventId: "evt_other_success",
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    expect(third.bookingStatus).toBe("PAID");
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.providerPayoutOre).toBe(450_000);
    const succeeded = await db.payment.findMany({
      where: { bookingId: booking.id, status: "SUCCEEDED" },
    });
    expect(succeeded).toHaveLength(2);
    expect(await db.booking.count({ where: { jobId: job.id } })).toBe(1);
  });

  it("gjenbruker ventende intensjon og stabil DEMO-hendelses-id", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Dobbel bekreftelse",
      description: "Skal ikke lage to intensjoner.",
      category: "elektriker",
      area: "Tøyen",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 150_000,
      message: "Fastpris uten kontakt.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    const first = await createPaymentIntent(db, booking.id);
    const second = await createPaymentIntent(db, booking.id);
    expect(second.id).toBe(first.id);

    const eventId = demoPaymentEventId(first.id, "payment.succeeded");
    expect(eventId).toBe(demoPaymentEventId(first.id, "payment.succeeded"));
    const firstPay = await handlePaymentWebhook(db, {
      eventId,
      type: "payment.succeeded",
      paymentIntentId: first.id,
      bookingId: booking.id,
    });
    const secondPay = await handlePaymentWebhook(db, {
      eventId,
      type: "payment.succeeded",
      paymentIntentId: first.id,
      bookingId: booking.id,
    });
    expect(firstPay.idempotentReplay).toBe(false);
    expect(secondPay.idempotentReplay).toBe(true);
    expect(await db.payment.count({ where: { bookingId: booking.id } })).toBe(1);
  });
});
