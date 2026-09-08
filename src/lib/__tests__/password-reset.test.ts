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

  it("avviser utløpt token", async () => {
    const users = await createTestUsers(db);
    const requested = await requestPasswordReset(db, users.customer.email);
    const tokenHash = (await db.passwordResetToken.findFirstOrThrow({
      where: { userId: users.customer.id },
      orderBy: { createdAt: "desc" },
    })).tokenHash;
    await db.passwordResetToken.updateMany({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resetPasswordWithToken(db, requested.token!, "NyttPass123!")).rejects.toThrow(/utløpt|ugyldig/);
  });

  it("svarer likt for ukjent e-post og rate-limiter", async () => {
    const missing = await requestPasswordReset(db, "finnes-ikke-2@test.no");
    expect(missing.created).toBe(false);
    expect(missing.token).toBeNull();
    const users = await createTestUsers(db);
    await requestPasswordReset(db, users.customer.email);
    await requestPasswordReset(db, users.customer.email);
    await requestPasswordReset(db, users.customer.email);
    const limited = await requestPasswordReset(db, users.customer.email);
    expect(limited.rateLimited).toBe(true);
    expect(limited.token).toBeNull();
  });
});
