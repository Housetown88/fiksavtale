import { calcCommission } from "./money";

export type ExtraLike = { amountOre: number; status: string };

export type BookingMoneySummary = {
  agreedOre: number;
  extrasPaidOre: number;
  extrasApprovedUnpaidOre: number;
  extrasProposedOre: number;
  fundedOre: number;
  combinedIfApprovedOre: number;
  feeOnFundedOre: number;
  feeOnApprovedExtraOre: number;
  feeOnProposedExtraOre: number;
  expectedSettlementOre: number;
  remainingToPayOre: number;
  unpaidApprovedCount: number;
  refundedOre: number;
  feeAfterRefundOre: number;
  settlementAfterRefundOre: number;
};

export type BookingMoneyView = BookingMoneySummary & {
  status: string;
  isCancelled: boolean;
  isRefunded: boolean;
  isHistorical: boolean;
  customerPayLabel: string;
  providerPayoutLabel: string;
  originalJobLabel: string;
  refundLabel: string | null;
};

export function summarizeBookingMoney(
  agreedOre: number,
  extras: ExtraLike[],
  platformFeeBps: number,
  options?: { status?: string; refundedOre?: number },
): BookingMoneySummary {
  const extrasPaidOre = extras
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + item.amountOre, 0);
  const extrasApprovedUnpaidOre = extras
    .filter((item) => item.status === "APPROVED")
    .reduce((sum, item) => sum + item.amountOre, 0);
  const extrasProposedOre = extras
    .filter((item) => item.status === "PROPOSED")
    .reduce((sum, item) => sum + item.amountOre, 0);
  const fundedOre = agreedOre + extrasPaidOre;
  const combinedIfApprovedOre = fundedOre + extrasApprovedUnpaidOre;
  const feeOnFundedOre = calcCommission(fundedOre, platformFeeBps).platformFeeOre;
  const feeOnApprovedExtraOre = calcCommission(extrasApprovedUnpaidOre, platformFeeBps).platformFeeOre;
  const feeOnProposedExtraOre = calcCommission(extrasProposedOre, platformFeeBps).platformFeeOre;
  const expectedSettlementOre = calcCommission(fundedOre, platformFeeBps).providerPayoutOre;
  const status = options?.status ?? "";
  const refundedOre = options?.refundedOre ?? 0;
  const remainingBase = status === "PENDING_PAYMENT" ? agreedOre : 0;
  const remainingToPayOre = ["CANCELLED", "REFUNDED"].includes(status)
    ? 0
    : remainingBase + extrasApprovedUnpaidOre;
  const netFunded = Math.max(0, fundedOre - refundedOre);
  const feeAfterRefundOre = calcCommission(netFunded, platformFeeBps).platformFeeOre;
  const settlementAfterRefundOre = calcCommission(netFunded, platformFeeBps).providerPayoutOre;
  return {
    agreedOre,
    extrasPaidOre,
    extrasApprovedUnpaidOre,
    extrasProposedOre,
    fundedOre,
    combinedIfApprovedOre,
    feeOnFundedOre,
    feeOnApprovedExtraOre,
    feeOnProposedExtraOre,
    expectedSettlementOre,
    remainingToPayOre,
    unpaidApprovedCount: extras.filter((item) => item.status === "APPROVED").length,
    refundedOre,
    feeAfterRefundOre,
    settlementAfterRefundOre,
  };
}

export function describeBookingMoney(input: {
  agreedOre: number;
  extras: ExtraLike[];
  platformFeeBps: number;
  status: string;
  refundedOre?: number;
}): BookingMoneyView {
  const summary = summarizeBookingMoney(input.agreedOre, input.extras, input.platformFeeBps, {
    status: input.status,
    refundedOre: input.refundedOre,
  });
  const isCancelled = input.status === "CANCELLED";
  const isRefunded = input.status === "REFUNDED" || (isCancelled && summary.refundedOre > 0);
  const isHistorical = isCancelled || input.status === "REFUNDED";
  let refundLabel: string | null = null;
  if (summary.refundedOre > 0 && summary.refundedOre >= summary.fundedOre && summary.fundedOre > 0) {
    refundLabel = "Full DEMO-refusjon er registrert i oppgjørsboken. Provisjonen er justert ned.";
  } else if (summary.refundedOre > 0) {
    refundLabel = "Delvis DEMO-refusjon er registrert. Provisjonen er justert forholdsmessig.";
  } else if (isCancelled || input.status === "REFUNDED") {
    refundLabel = "Ingen beløp ble finansiert. Ingenting gjenstår å betale.";
  }

  return {
    ...summary,
    status: input.status,
    isCancelled,
    isRefunded,
    isHistorical,
    originalJobLabel: "Opprinnelig jobbpris",
    customerPayLabel: isHistorical
      ? "Historisk avtalesum"
      : summary.extrasPaidOre > 0
        ? "Totalt inkl. betalte tillegg"
        : "Du betaler",
    providerPayoutLabel: isHistorical ? "Historisk forventet oppgjør" : "Forventet oppgjør til firma",
    refundLabel,
  };
}

export function extraImpact(input: {
  agreedOre: number;
  extras: ExtraLike[];
  extraAmountOre: number;
  platformFeeBps: number;
}) {
  const fundedOre =
    input.agreedOre +
    input.extras.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountOre, 0);
  const combinedOre = fundedOre + input.extraAmountOre;
  const extraFeeOre = calcCommission(input.extraAmountOre, input.platformFeeBps).platformFeeOre;
  return {
    extraAmountOre: input.extraAmountOre,
    extraFeeOre,
    currentFundedOre: fundedOre,
    combinedOre,
  };
}
