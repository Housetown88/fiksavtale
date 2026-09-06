import { PrismaClient } from "@prisma/client";
import { databaseUrl, isLibsqlUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrisma(overrideUrl?: string) {
  const url = databaseUrl(overrideUrl);
  if (isLibsqlUrl(url)) {
    // Lastes bare for Turso — unngå å kreve adapteren for SQLite/Neon.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
    const adapter = new PrismaLibSQL({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient(
    overrideUrl || process.env.DATABASE_URL
      ? { datasources: { db: { url } } }
      : undefined,
  );
}

export const db = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
