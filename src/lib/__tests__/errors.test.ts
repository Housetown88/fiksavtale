import { describe, expect, it } from "vitest";
import { errorMessage } from "../errors";
import { DatabaseUnavailableError } from "../database-url";

describe("feilmeldinger", () => {
  it("lekker ikke DATABASE_URL/SQLite til kunden", () => {
    expect(errorMessage(new DatabaseUnavailableError())).toBe("Noe gikk galt. Prøv igjen.");
    expect(
      errorMessage(new Error("På Vercel må DATABASE_URL peke på Neon eller Turso — ikke en SQLite-fil")),
    ).toBe("Noe gikk galt. Prøv igjen.");
    expect(errorMessage(new Error("Tillegget må betales først"))).toBe("Tillegget må betales først");
  });
});
