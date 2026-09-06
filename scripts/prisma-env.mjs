/**
 * Picks the Prisma schema from DATABASE_URL.
 * Postgres/Neon → schema.postgres.prisma
 * SQLite file or Turso/libSQL → schema.prisma
 */
export function databaseUrl() {
  return process.env.DATABASE_URL ?? "file:./dev.db";
}

export function isPostgresUrl(url = databaseUrl()) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function schemaPath() {
  return isPostgresUrl() ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";
}
