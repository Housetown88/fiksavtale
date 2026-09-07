import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { requestPasswordReset, resetPasswordWithToken, verifyPassword } from "../domain";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("passordtilbakestilling", () => {
  it("bytter passord med gyldig token og avviser brukt token", async () => {
    const users = await createTestUsers(db);
    const missing = await requestPasswordReset(db, "finnes-ikke@test.no");
    expect(missing.created).toBe(false);

    const requested = await requestPasswordReset(db, users.customer.email);
    expect(requested.created).toBe(true);
    expect(requested.token).toBeTruthy();

    await resetPasswordWithToken(db, requested.token!, "NyttPass123!");
    const updated = await db.user.findUniqueOrThrow({ where: { id: users.customer.id } });
    expect(await verifyPassword("NyttPass123!", updated.passwordHash)).toBe(true);

    await expect(resetPasswordWithToken(db, requested.token!, "EndaNytt123!")).rejects.toThrow(/ugyldig/);
  });
});
