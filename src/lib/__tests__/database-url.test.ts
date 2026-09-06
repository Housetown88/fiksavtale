import { describe, expect, it } from "vitest";
import { isFileSqliteUrl, isLibsqlUrl, isPostgresUrl } from "../database-url";

describe("database-url", () => {
  it("kjenner igjen sqlite-fil, postgres og turso", () => {
    expect(isFileSqliteUrl("file:./dev.db")).toBe(true);
    expect(isPostgresUrl("postgresql://user:pass@host/db")).toBe(true);
    expect(isLibsqlUrl("libsql://demo-org.turso.io")).toBe(true);
    expect(isPostgresUrl("file:./dev.db")).toBe(false);
  });
});
