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
    expect(money.financedOre).toBe(0);
    expect(money.remainingToPayOre).toBe(0);
    expect(money.refund.status).toBe("not_applicable");
    expect(money.refund.statusLabel).toBe("Ikke aktuelt");
    expect(money.refundLabel).toMatch(/Ingenting gjenstår/);
  });

  it("viser venter DEMO-refusjon og null gjenstående når bookingen er i tvist", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "PAID" }],
      platformFeeBps: 1000,
      status: "DISPUTED",
      refundedOre: 0,
    });
    expect(money.isDisputed).toBe(true);
    expect(money.isClosed).toBe(true);
    expect(money.remainingToPayOre).toBe(0);
    expect(money.refund.status).toBe("pending");
    expect(money.refund.statusLabel).toBe("Venter");
    expect(money.refund.heldOre).toBe(170_000);
    expect(money.refund.amountOre).toBe(0);
    expect(money.refund.headline).toMatch(/venter/i);
    expect(money.refund.detail).toMatch(/oppgjørsboken/i);
    expect(money.refund.detail).toMatch(/ingen ekte Vipps/i);
    expect(money.customerPayLabel).toMatch(/holdes i tvist/i);
  });

  it("viser registrert DEMO-refusjon etter avbestilling før start", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [],
      platformFeeBps: 1000,
      status: "REFUNDED",
      refundedOre: 150_000,
    });
    expect(money.refund.status).toBe("applied");
    expect(money.refund.statusLabel).toBe("Registrert");
    expect(money.refund.amountOre).toBe(150_000);
    expect(money.remainingToPayOre).toBe(0);
    expect(money.refund.detail).toMatch(/ikke et ekte Vipps/i);
    expect(money.financedOre).toBe(150_000);
    expect(money.agreedOre).toBe(150_000);
  });

  it("flagger historisk fullført med ubetalte godkjente tillegg uten å kreve betaling", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "APPROVED" }],
      platformFeeBps: 1000,
      status: "COMPLETED",
    });
    expect(money.remainingToPayOre).toBe(0);
    expect(money.inconsistentUnpaidApproved).toBe(true);
    expect(money.unpaidApprovedCount).toBe(1);
    expect(money.extrasApprovedUnpaidOre).toBe(20_000);
    expect(money.isClosed).toBe(true);
  });

  it("flagger ikke avbestilt/tvist med ubetalt tillegg som fullføringsavvik", () => {
    const refunded = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "APPROVED" }],
      platformFeeBps: 1000,
      status: "REFUNDED",
      refundedOre: 150_000,
    });
    expect(refunded.inconsistentUnpaidApproved).toBe(false);
    expect(refunded.unpaidApprovedCount).toBe(1);
    expect(refunded.remainingToPayOre).toBe(0);
    expect(refunded.financedOre).toBe(150_000);

    const disputed = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "APPROVED" }],
      platformFeeBps: 1000,
      status: "DISPUTED",
    });
    expect(disputed.inconsistentUnpaidApproved).toBe(false);
    expect(disputed.unpaidApprovedCount).toBe(1);
    expect(disputed.remainingToPayOre).toBe(0);
  });

  it("viser 0 kr finansiert for ubetalt booking", () => {
    const pending = describeBookingMoney({
      agreedOre: 220_000,
      extras: [],
      platformFeeBps: 1000,
      status: "PENDING_PAYMENT",
    });
    expect(pending.agreedOre).toBe(220_000);
    expect(pending.financedOre).toBe(0);
    expect(pending.remainingToPayOre).toBe(220_000);
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

  it("skiller allerede finansiert hovedjobb fra gjenstående tillegg", () => {
    const money = describeBookingMoney({
      agreedOre: 150_000,
      extras: [{ amountOre: 20_000, status: "APPROVED" }],
      platformFeeBps: 1000,
      status: "IN_PROGRESS",
    });
    expect(money.customerPayLabel).toBe("Allerede finansiert");
    expect(money.customerPayLabel).not.toBe("Du betaler");
    expect(money.fundedOre).toBe(150_000);
    expect(money.remainingToPayOre).toBe(20_000);
  });
});
