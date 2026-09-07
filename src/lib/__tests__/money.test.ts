import { describe, expect, it } from "vitest";
import { calcCommission, formatNok } from "../money";

describe("gebyrregning", () => {
  it("tar 10 % av 5000 NOK", () => {
    const result = calcCommission(500_000, 1000);
    expect(result.platformFeeOre).toBe(50_000);
    expect(result.providerPayoutOre).toBe(450_000);
    expect(formatNok(500_000)).toContain("5");
  });

  it("oppdaterer forhåndsvisning fra redigert pris", () => {
    const first = calcCommission(150_000, 1000);
    const edited = calcCommission(200_000, 1000);
    expect(first.platformFeeOre).toBe(15_000);
    expect(edited.platformFeeOre).toBe(20_000);
    expect(edited.providerPayoutOre).toBe(180_000);
  });
});
