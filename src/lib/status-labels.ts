const LABELS: Record<string, string> = {
  OPEN: "Åpent",
  OFFER_ACCEPTED: "Tilbud valgt",
  BOOKED: "Booket",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
  DISPUTED: "Tvist",
  PENDING_PAYMENT: "Venter betaling",
  PAID: "Betalt",
  REFUNDED: "Refundert",
  PENDING: "Venter",
  ACCEPTED: "Godtatt",
  REJECTED: "Avslått",
  FAILED: "Feilet",
  SUCCEEDED: "Bekreftet",
  OPEN_REPORT: "Åpen",
  PROPOSED: "Foreslått",
  APPROVED: "Godkjent — venter betaling",
  REVIEWED: "Behandlet",
  DISMISSED: "Avvist",
  WITHDRAWN: "Trukket",
  EXPIRED: "Utløpt",
};

export function statusLabelNb(status: string): string {
  return LABELS[status] ?? status;
}

export function statusLabelWithRaw(status: string): { label: string; raw: string } {
  return { label: statusLabelNb(status), raw: status };
}
