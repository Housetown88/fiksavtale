import { calcCommission } from "./money";

export type ExtraLike = { amountOre: number; status: string };

export const TERMINAL_BOOKING_STATUSES = ["CANCELLED", "REFUNDED", "DISPUTED", "COMPLETED"] as const;

export type DemoRefundStatus = "applied" | "pending" | "not_applicable";

export type DemoRefundView = {
  status: DemoRefundStatus;
  statusLabel: string;
  amountOre: number;
  heldOre: number;
  headline: string;
  detail: string;
};

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
  inconsistentUnpaidApproved: boolean;
};

export type BookingMoneyView = BookingMoneySummary & {
  status: string;
  isCancelled: boolean;
  isRefunded: boolean;
  isDisputed: boolean;
  isHistorical: boolean;
  isClosed: boolean;
  customerPayLabel: string;
  providerJobLabel: string;
  providerPayoutLabel: string;
  originalJobLabel: string;
  refundLabel: string | null;
  refund: DemoRefundView;
};

export function isTerminalBookingStatus(status: string): boolean {
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function unpaidApprovedExtras<T extends { status: string }>(extras: T[]): T[] {
  return extras.filter((item) => item.status === "APPROVED");
}

const REFUND_STATUS_LABEL: Record<DemoRefundStatus, string> = {
  applied: "Registrert",
  pending: "Venter",
  not_applicable: "Ikke aktuelt",
};

export function describeDemoRefund(input: {
  status: string;
  fundedOre: number;
  refundedOre?: number;
}): DemoRefundView {
  const refundedOre = Math.max(0, input.refundedOre ?? 0);
  const heldOre = Math.max(0, input.fundedOre - refundedOre);
  const base = {
    statusLabel: REFUND_STATUS_LABEL.not_applicable,
    amountOre: refundedOre,
    heldOre,
  };

  if (refundedOre > 0) {
    const full = input.fundedOre > 0 && refundedOre >= input.fundedOre;
    return {
      ...base,
      status: "applied",
      statusLabel: REFUND_STATUS_LABEL.applied,
      headline: full ? "DEMO-refusjon: registrert" : "DEMO-refusjon: registrert (delvis)",
      detail: full
        ? "Full DEMO-refusjon er registrert i oppgjørsboken. Provisjonen er justert ned. Dette er ikke et ekte Vipps-tilbake."
        : "Delvis DEMO-refusjon er registrert. Provisjonen er justert forholdsmessig. Dette er ikke et ekte Vipps-tilbake.",
    };
  }

  if (input.status === "DISPUTED") {
    return {
      ...base,
      status: "pending",
      statusLabel: REFUND_STATUS_LABEL.pending,
      headline: "DEMO-refusjon: venter (tvist)",
      detail:
        "Avbestilling etter at arbeidet er startet åpner tvist. Finansierte beløp holdes i oppgjørsboken — ingen DEMO-refusjon er bokført ennå, og det skjer ingen ekte Vipps-tilbakebetaling. Kontakt forblir synlig fordi den allerede er delt.",
    };
  }

  if (input.status === "CANCELLED" || input.status === "REFUNDED") {
    return {
      ...base,
      status: "not_applicable",
      headline: "DEMO-refusjon: ikke aktuelt",
      detail: "Ingen beløp ble finansiert. Ingenting gjenstår å betale.",
    };
  }

  return {
    ...base,
    status: "not_applicable",
    headline: "DEMO-refusjon: ikke aktuelt",
    detail: "Ingen DEMO-refusjon er registrert. Bookingen er aktiv.",
  };
}

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
  const remainingToPayOre = isTerminalBookingStatus(status)
    ? 0
    : remainingBase + extrasApprovedUnpaidOre;
  const netFunded = Math.max(0, fundedOre - refundedOre);
  const feeAfterRefundOre = calcCommission(netFunded, platformFeeBps).platformFeeOre;
  const settlementAfterRefundOre = calcCommission(netFunded, platformFeeBps).providerPayoutOre;
  const unpaidApprovedCount = unpaidApprovedExtras(extras).length;
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
    unpaidApprovedCount,
    refundedOre,
    feeAfterRefundOre,
    settlementAfterRefundOre,
    inconsistentUnpaidApproved: isTerminalBookingStatus(status) && unpaidApprovedCount > 0,
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
  const isDisputed = input.status === "DISPUTED";
  const isRefunded = input.status === "REFUNDED" || (isCancelled && summary.refundedOre > 0);
  const isClosed = isTerminalBookingStatus(input.status);
  const isHistorical = isCancelled || input.status === "REFUNDED";
  const refund = describeDemoRefund({
    status: input.status,
    fundedOre: summary.fundedOre,
    refundedOre: summary.refundedOre,
  });
  const refundLabel =
    refund.status !== "not_applicable" || isCancelled || isRefunded || isDisputed ? refund.detail : null;

  return {
    ...summary,
    status: input.status,
    isCancelled,
    isRefunded,
    isDisputed,
    isHistorical,
    isClosed,
    originalJobLabel: "Opprinnelig jobbpris",
    customerPayLabel: isDisputed
      ? "Finansiert beløp (holdes i tvist)"
      : isHistorical
        ? "Historisk avtalesum"
        : summary.extrasPaidOre > 0
          ? "Totalt inkl. betalte tillegg"
          : ["PAID", "IN_PROGRESS", "COMPLETED"].includes(input.status)
            ? "Allerede finansiert"
            : "Du betaler",
    providerJobLabel: isDisputed
      ? "Finansiert beløp (holdes i tvist)"
      : isHistorical
        ? "Historisk avtalesum"
        : "Avtalt jobbpris",
    providerPayoutLabel: isDisputed
      ? "Oppgjør holdes (tvist)"
      : isHistorical
        ? "Historisk forventet oppgjør"
        : "Forventet oppgjør til firma",
    refundLabel,
    refund,
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
