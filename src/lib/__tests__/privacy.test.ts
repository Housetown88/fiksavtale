import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { anonymizeUser, createDataRequest, exportUserData } from "../privacy";
import { AuthzError } from "../authz";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("personvern", () => {
  it("eksporterer egne data og anonymiserer uten å slette oppgjør", async () => {
    const users = await createTestUsers(db);
    const exported = await exportUserData(db, { id: users.customer.id, role: "CUSTOMER" });
    expect(exported.account.email).toBe(users.customer.email);
    expect(exported.account.phone).toBe("40000001");

    await createDataRequest(db, { id: users.customer.id, role: "CUSTOMER" }, { type: "DELETION" });
    await anonymizeUser(db, { id: "admin", role: "ADMIN" }, users.customer.id);
    const after = await db.user.findUniqueOrThrow({ where: { id: users.customer.id } });
    expect(after.deletedAt).toBeTruthy();
    expect(after.email).toContain("anonymisert");
    expect(after.phone).toBeNull();
    expect(after.name).toBe("Slettet bruker");
  });

  it("lar ikke en annen kunde eksportere andres data via viewer-id", async () => {
    const users = await createTestUsers(db);
    await expect(exportUserData(db, { id: users.otherCustomer.id, role: "CUSTOMER" })).resolves.toMatchObject({
      account: { email: users.otherCustomer.email },
    });
    const exported = await exportUserData(db, { id: users.otherCustomer.id, role: "CUSTOMER" });
    expect(JSON.stringify(exported)).not.toContain(users.customer.email);
    expect(JSON.stringify(exported)).not.toContain("Markveien 12");
  });

  it("avviser sletting uten tilgang", async () => {
    const users = await createTestUsers(db);
    await expect(
      anonymizeUser(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, users.customer.id),
    ).rejects.toBeInstanceOf(AuthzError);
  });
});
