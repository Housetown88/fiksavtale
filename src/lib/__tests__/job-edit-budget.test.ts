import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer, updateJob } from "../domain";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("redigering og budsjett i domain", () => {
  it("avviser omvendt budsjett ved publisering", async () => {
    const users = await createTestUsers(db);
    await expect(
      createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
        title: "Dårlig budsjett",
        description: "Test",
        category: "hage",
        area: "Sagene",
        budgetMinOre: 200_000,
        budgetMaxOre: 100_000,
      }),
    ).rejects.toThrow(/høyere/);
  });

  it("lar eier redigere åpne oppdrag og låser etter valgt tilbud", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Åpent oppdrag",
      description: "Kan redigeres.",
      category: "maling",
      area: "Frogner",
    });
    const updated = await updateJob(db, { id: users.customer.id, role: "CUSTOMER" }, job.id, {
      title: "Oppdatert tittel",
      description: "Ny tekst.",
      category: "maling",
      area: "Frogner",
    });
    expect(updated.title).toBe("Oppdatert tittel");

    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 200_000,
      message: "Kan starte i morgen.",
    });
    await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    await expect(
      updateJob(db, { id: users.customer.id, role: "CUSTOMER" }, job.id, {
        title: "For sent",
        description: "Skal feile.",
        category: "maling",
        area: "Frogner",
      }),
    ).rejects.toThrow(/åpent/);
  });
});
