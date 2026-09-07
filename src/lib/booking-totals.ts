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
  payoutAfterInvoiceOre: number;
  unpaidApprovedCount: number;
};

export function summarizeBookingMoney(
  agreedOre: number,
  extras: ExtraLike[],
  platformFeeBps: number,
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
  const payoutAfterInvoiceOre = calcCommission(fundedOre, platformFeeBps).providerPayoutOre;
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
    payoutAfterInvoiceOre,
    unpaidApprovedCount: extras.filter((item) => item.status === "APPROVED").length,
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
