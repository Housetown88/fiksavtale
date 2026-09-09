import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { createJob, createOffer, createOfferResult } from "../domain";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("opprettelse av tilbud", () => {
  it("oppretter ikke duplikat ved aktivt tilbud og returnerer det eksisterende", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      {
        title: "Bytte kran",
        description: "Lekker på kjøkkenet.",
        category: "rorlegger",
        area: "Grünerløkka",
      },
    );
    const first = await createOfferResult(
      db,
      { id: users.provider.id, role: "PROVIDER" },
      {
        jobId: job.id,
        amountOre: 450_000,
        message: "Vi kan starte onsdag.",
      },
    );
    expect(first.created).toBe(true);

    const second = await createOfferResult(
      db,
      { id: users.provider.id, role: "PROVIDER" },
      {
        jobId: job.id,
        amountOre: 990_000,
        message: "Annet beløp som ikke skal lagres.",
      },
    );
    expect(second.created).toBe(false);
    expect(second.offer.id).toBe(first.offer.id);
    expect(second.offer.amountOre).toBe(450_000);
    expect(second.offer.message).toBe("Vi kan starte onsdag.");

    const count = await db.offer.count({
      where: { jobId: job.id, providerId: users.provider.id },
    });
    expect(count).toBe(1);
  });

  it("lar createOffer fortsette å returnere selve tilbudet", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      {
        title: "Maling av stue",
        description: "To strøk, hvit.",
        category: "maling",
        area: "Frogner",
      },
    );
    const offer = await createOffer(
      db,
      { id: users.provider.id, role: "PROVIDER" },
      {
        jobId: job.id,
        amountOre: 200_000,
        message: "Inkluderer sparkling.",
      },
    );
    expect(offer.id).toBeTruthy();
    expect(offer.amountOre).toBe(200_000);
  });
});
