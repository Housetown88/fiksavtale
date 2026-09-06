import { PrismaClient } from "@prisma/client";
import {
  canUseDatabase,
  DatabaseUnavailableError,
  databaseUrl,
  isLibsqlUrl,
} from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrisma(overrideUrl?: string) {
  if (!overrideUrl) {
    const availability = canUseDatabase();
    if (!availability.ok) {
      throw new DatabaseUnavailableError(availability.message);
    }
  }

  const url = databaseUrl(overrideUrl);
  if (!url) {
    throw new DatabaseUnavailableError();
  }

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

  return new PrismaClient({ datasources: { db: { url } } });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

/** Lazy Prisma-klient — konstrueres ikke ved import. */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
