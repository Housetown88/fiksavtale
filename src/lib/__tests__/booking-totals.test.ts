import { describe, expect, it } from "vitest";
import { describeBookingMoney, extraImpact, summarizeBookingMoney } from "../booking-totals";

describe("prisoversikt", () => {
  it("skiller jobbpris, betalte tillegg og gjenstående", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [
        { amountOre: 20_000, status: "PAID" },
        { amountOre: 10_000, status: "APPROVED" },
      ],
      platformFeeBps: 1000,
      status: "PAID",
    });
    expect(money.agreedOre).toBe(150_000);
    expect(money.extrasPaidOre).toBe(20_000);
    expect(money.fundedOre).toBe(170_000);
    expect(money.feeOnFundedOre).toBe(17_000);
    expect(money.remainingToPayOre).toBe(10_000);
    expect(money.originalJobLabel).toBe("Opprinnelig jobbpris");
    expect(money.customerPayLabel).toBe("Totalt inkl. betalte tillegg");
    expect(money.customerPayLabel).not.toBe("Du betaler");
    expect(money.providerJobLabel).toBe("Avtalt jobbpris");
    expect(money.providerJobLabel).not.toBe("Du betaler");
    expect(money.expectedSettlementOre).toBe(153_000);
  });

  it("viser historikk og ikke betalingskrav når bookingen er avbestilt", () => {
    const money = describeBookingMoney({
      agreedOre: 120_000,
      extras: [],
      platformFeeBps: 1000,
      status: "CANCELLED",
      refundedOre: 0,
    });
    expect(money.originalJobLabel).toBe("Opprinnelig jobbpris");
    expect(money.customerPayLabel).toBe("Historisk avtalesum");
    expect(money.customerPayLabel).not.toBe("Du betaler");
    expect(money.remainingToPayOre).toBe(0);
    expect(money.refundLabel).toMatch(/Ingenting gjenstår/);
  });

  it("justerer gebyr etter delvis refusjon uten dobbelttelling", () => {
    const money = summarizeBookingMoney(
      150_000,
      [{ amountOre: 20_000, status: "PAID" }],
      1000,
      { status: "PAID", refundedOre: 20_000 },
    );
    expect(money.fundedOre).toBe(170_000);
    expect(money.feeOnFundedOre).toBe(17_000);
    expect(money.feeAfterRefundOre).toBe(15_000);
    expect(money.settlementAfterRefundOre).toBe(135_000);
  });

  it("viser 1500 + 200 som totalt 1700 med gebyr 170, ikke Du betaler 1500", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "PAID" }],
      platformFeeBps: 1000,
      status: "PAID",
    });
    expect(money.originalJobLabel).toBe("Opprinnelig jobbpris");
    expect(money.agreedOre).toBe(150_000);
    expect(money.fundedOre).toBe(170_000);
    expect(money.feeOnFundedOre).toBe(17_000);
    expect(money.customerPayLabel).toBe("Totalt inkl. betalte tillegg");
    expect(`${money.originalJobLabel} ${money.customerPayLabel}`).not.toMatch(/Du betaler/);
  });

  it("beregner tilleggseffekt uten å endre jobbprisen", () => {
    const impact = extraImpact({
      agreedOre: 150_000,
      extras: [],
      extraAmountOre: 20_000,
      platformFeeBps: 1000,
    });
    expect(impact.combinedOre).toBe(170_000);
    expect(impact.extraFeeOre).toBe(2_000);
  });
});
