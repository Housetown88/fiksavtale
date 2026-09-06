export function databaseUrl(override?: string): string {
  return override ?? process.env.DATABASE_URL ?? "file:./dev.db";
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
