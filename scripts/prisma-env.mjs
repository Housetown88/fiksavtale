/**
 * Velger Prisma-skjema fra DATABASE_URL.
 *
 * prisma/schema.prisma er PostgreSQL — Vercel og `prisma generate` uten --schema
 * bruker den. SQLite/Turso: prisma/schema.sqlite.prisma.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env.DATABASE_URL = value;
    return;
  }
}

loadDotEnvDatabaseUrl();

export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return process.env.VERCEL ? "" : "file:./dev.db";
}

export function isPostgresUrl(url = databaseUrl()) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function isFileSqliteUrl(url = databaseUrl()) {
  return url.startsWith("file:");
}

export function isLibsqlUrl(url = databaseUrl()) {
  return (
    url.startsWith("libsql://") ||
    url.startsWith("libsql:") ||
    (url.startsWith("https://") && url.includes("turso.io"))
  );
}

export function schemaPath() {
  const url = databaseUrl();
  if (isPostgresUrl(url)) return "prisma/schema.prisma";
  if (isFileSqliteUrl(url) || isLibsqlUrl(url)) return "prisma/schema.sqlite.prisma";
  // Vercel uten file:-URL: aldri SQLite-provider (Neon-URL avvises da).
  if (process.env.VERCEL) return "prisma/schema.prisma";
  return "prisma/schema.sqlite.prisma";
}
