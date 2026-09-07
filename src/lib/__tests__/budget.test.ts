import { describe, expect, it } from "vitest";
import { formatBudgetRange, parseBudgetRange } from "../budget";
import { formatNok } from "../money";

describe("budsjett", () => {
  it("godtar tomt og ensidig intervall", () => {
    expect(parseBudgetRange({ budgetMin: "", budgetMax: "" })).toEqual({
      budgetMinOre: null,
      budgetMaxOre: null,
    });
    expect(parseBudgetRange({ budgetMin: "2000" }).budgetMinOre).toBe(200_000);
    expect(parseBudgetRange({ budgetMax: "1500.5" }).budgetMaxOre).toBe(150_050);
  });

  it("avviser fra > til og negative", () => {
    expect(() => parseBudgetRange({ budgetMin: "2000", budgetMax: "1000" })).toThrow(/høyere/);
    expect(() => parseBudgetRange({ budgetMin: "-1" })).toThrow(/negativt/);
  });

  it("formaterer ensidig intervall", () => {
    expect(formatBudgetRange(200_000, null, formatNok)).toMatch(/Fra/);
    expect(formatBudgetRange(null, 100_000, formatNok)).toMatch(/Inntil/);
  });
});
