export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function databaseUrl(override?: string): string {
  if (override) return override;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (isVercelRuntime()) return "";
  return "file:./dev.db";
}

export function isPostgresUrl(url = databaseUrl()): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function isLibsqlUrl(url = databaseUrl()): boolean {
  return (
    url.startsWith("libsql://") ||
    url.startsWith("libsql:") ||
    (url.startsWith("https://") && url.includes("turso.io"))
  );
}

export function isFileSqliteUrl(url = databaseUrl()): boolean {
  return url.startsWith("file:");
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.AUTH_SECRET || "";
}

export function shouldResetSeed(url = databaseUrl()): boolean {
  return process.env.SEED_RESET === "1" || isFileSqliteUrl(url);
}

export const DATABASE_UNAVAILABLE_NB =
  "Databasen er ikke klar. På Vercel må DATABASE_URL peke på Neon (postgresql://) eller Turso (libsql://) — ikke en SQLite-fil. Opprett tabellene med npm run db:push.";

export type DatabaseAvailability =
  | { ok: true }
  | { ok: false; reason: "missing" | "sqlite-on-vercel"; message: string };

export function canUseDatabase(override?: string): DatabaseAvailability {
  const url = override ?? process.env.DATABASE_URL ?? "";
  if (isVercelRuntime()) {
    if (!url) {
      return { ok: false, reason: "missing", message: DATABASE_UNAVAILABLE_NB };
    }
    if (isFileSqliteUrl(url)) {
      return { ok: false, reason: "sqlite-on-vercel", message: DATABASE_UNAVAILABLE_NB };
    }
  }
  return { ok: true };
}

export class DatabaseUnavailableError extends Error {
  constructor(message = DATABASE_UNAVAILABLE_NB) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}
