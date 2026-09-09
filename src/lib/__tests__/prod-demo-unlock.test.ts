import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";
import { canViewerSeeContact } from "../contact";
import { createPaymentIntent, handlePaymentWebhook } from "../payments";

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

describe("DEMO-betaling i produksjon", () => {
  it("låser ikke opp ekte kundedata i produksjon", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ALLOW_DEMO_PAYMENTS;
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Ekte kunde",
      description: "Skal ikke låses opp av DEMO i prod.",
      category: "elektriker",
      area: "Sagene",
      addressLine: "Bentsebrugata 1",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 180_000,
      message: "Kan starte mandag.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    const intent = await createPaymentIntent(db, booking.id);
    const result = await handlePaymentWebhook(db, {
      eventId: `prod_block_${intent.id}`,
      type: "payment.succeeded",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    expect(result.ignored).toBe("prod_demo_blocked");
    expect(result.contactUnlocked).toBe(false);
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("PENDING_PAYMENT");
    expect(after.contactUnlockedAt).toBeNull();
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(false);
    const intentAfter = await db.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    expect(intentAfter.status).toBe("PENDING");
    const succeeded = await db.payment.findMany({
      where: { bookingId: booking.id, status: "SUCCEEDED" },
    });
    expect(succeeded).toHaveLength(0);
  });
});
