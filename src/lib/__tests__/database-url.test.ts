import { afterEach, describe, expect, it } from "vitest";
import {
  canUseDatabase,
  isFileSqliteUrl,
  isLibsqlUrl,
  isPostgresUrl,
} from "../database-url";

const originalVercel = process.env.VERCEL;
const originalUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
});

describe("database-url", () => {
  it("kjenner igjen sqlite-fil, postgres og turso", () => {
    expect(isFileSqliteUrl("file:./dev.db")).toBe(true);
    expect(isPostgresUrl("postgresql://user:pass@host/db")).toBe(true);
    expect(isLibsqlUrl("libsql://demo-org.turso.io")).toBe(true);
    expect(isPostgresUrl("file:./dev.db")).toBe(false);
  });

  it("blokkerer manglende eller fil-SQLite DATABASE_URL på Vercel", () => {
    process.env.VERCEL = "1";
    delete process.env.DATABASE_URL;
    expect(canUseDatabase().ok).toBe(false);

    process.env.DATABASE_URL = "file:./dev.db";
    const blocked = canUseDatabase();
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("sqlite-on-vercel");

    process.env.DATABASE_URL = "postgresql://user:pass@host/db";
    expect(canUseDatabase().ok).toBe(true);
  });
});
