import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("samtidig godtak av tilbud", () => {
  it("lar bare ett tilbud bli booking", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "To tilbud",
      description: "Skal bare godtas én gang.",
      category: "maling",
      area: "Frogner",
    });
    const first = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 200_000,
      message: "Første tilbud uten kontakt.",
    });
    const second = await createOffer(db, { id: users.otherProvider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 220_000,
      message: "Andre tilbud uten kontakt.",
    });
    const viewer = { id: users.customer.id, role: "CUSTOMER" as const };
    const results = await Promise.allSettled([
      acceptOffer(db, viewer, first.id),
      acceptOffer(db, viewer, second.id),
    ]);
    const ok = results.filter((item) => item.status === "fulfilled");
    const fail = results.filter((item) => item.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(fail).toHaveLength(1);
    expect(await db.booking.count({ where: { jobId: job.id } })).toBe(1);
  });
});
