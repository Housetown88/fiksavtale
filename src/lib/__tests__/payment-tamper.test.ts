import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";
import { createPaymentIntent } from "../payments";
import { getBookingForViewer } from "../authz";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("beløp og eierskap", () => {
  it("tar beløp fra serveren, ikke fra klienten", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Prisbeskyttelse",
      description: "Beløp skal ikke kunne tukles med.",
      category: "elektriker",
      area: "Tøyen",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 150_000,
      message: "Fastpris.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    const intent = await createPaymentIntent(db, booking.id);
    expect(intent.amountOre).toBe(150_000);
    await expect(createPaymentIntent(db, booking.id, { extraChargeId: "fake-extra" })).rejects.toThrow();
  });

  it("hindrer feil rolle i å lese andres booking", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Privat booking",
      description: "Ikke for uvedkommende.",
      category: "maling",
      area: "Frogner",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 160_000,
      message: "Kan starte tirsdag.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    await expect(
      getBookingForViewer(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, booking.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getBookingForViewer(db, { id: users.otherProvider.id, role: "PROVIDER" }, booking.id),
    ).rejects.toMatchObject({ status: 403 });
  });
});
