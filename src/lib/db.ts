import { PrismaClient } from "@prisma/client";
import { databaseUrl, isLibsqlUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrisma(overrideUrl?: string) {
  const url = databaseUrl(overrideUrl);
  if (isLibsqlUrl(url)) {
    // Lastes bare for Turso. webpackIgnore: webpack skal ikke folde inn pakken.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require(/* webpackIgnore: true */ "@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
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
