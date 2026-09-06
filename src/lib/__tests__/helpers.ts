import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { createPrisma } from "../db";
import { hashPassword } from "../domain";
import { orgNumberWithChecksum } from "../orgnr";

export async function setupTestDb(): Promise<PrismaClient> {
  const testDb = path.join(
    process.cwd(),
    "prisma",
    `test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
  );
  const testUrl = `file:${testDb}`;
  if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  // New empty file — do not use --force-reset (blocked for AI agents).
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
  const db = createPrisma(testUrl);
  await db.platformSettings.create({
    data: { id: "default", platformFeeBps: 1000 },
  });
  return db;
}

export async function createTestUsers(db: PrismaClient) {
  const passwordHash = await hashPassword("TestPass123!");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const customer = await db.user.create({
    data: {
      email: `kari-${suffix}@test.no`,
      passwordHash,
      name: "Kari Nordmann",
      phone: "40000001",
      role: "CUSTOMER",
      customerProfile: {
        create: {
          addressLine: "Markveien 12",
          postalCode: "0550",
          city: "Oslo",
          area: "Grünerløkka",
        },
      },
    },
  });
  const otherCustomer = await db.user.create({
    data: {
      email: `ola-${suffix}@test.no`,
      passwordHash,
      name: "Ola Hansen",
      phone: "40000002",
      role: "CUSTOMER",
      customerProfile: {
        create: {
          addressLine: "Bygdøy allé 8",
          postalCode: "0262",
          city: "Oslo",
          area: "Frogner",
        },
      },
    },
  });
  const provider = await db.user.create({
    data: {
      email: `bjorn-${suffix}@test.no`,
      passwordHash,
      name: "Bjørn Holm",
      phone: "90000001",
      role: "PROVIDER",
      providerProfile: {
        create: {
          companyName: "Nordfjell Elektro AS",
          orgNumber: orgNumberWithChecksum("91827364"),
          orgVerified: true,
          about: "Elektriker i Oslo.",
          serviceAreas: "Oslo",
          invoiceEmail: "faktura@nordfjell.no",
        },
      },
    },
  });
  const otherProvider = await db.user.create({
    data: {
      email: `silje-${suffix}@test.no`,
      passwordHash,
      name: "Silje Berg",
      phone: "90000002",
      role: "PROVIDER",
      providerProfile: {
        create: {
          companyName: "Oslo Rør & Bad AS",
          orgNumber: orgNumberWithChecksum("81234567"),
          orgVerified: true,
          about: "Rørlegger.",
          serviceAreas: "Oslo",
        },
      },
    },
  });
  return { customer, otherCustomer, provider, otherProvider };
}
