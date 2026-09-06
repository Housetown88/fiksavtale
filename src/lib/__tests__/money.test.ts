import { describe, expect, it } from "vitest";
import { calcCommission, formatNok } from "../money";

describe("gebyrregning", () => {
  it("tar 10 % av 5000 NOK", () => {
    const result = calcCommission(500_000, 1000);
    expect(result.platformFeeOre).toBe(50_000);
    expect(result.providerPayoutOre).toBe(450_000);
    expect(formatNok(500_000)).toContain("5");
  });
});
