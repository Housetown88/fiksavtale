import { AuthzError } from "./authz";
import { LeakFilterError } from "./leak-filter";

export const OFFER_SEND_FAILED = "Tilbudet kunne ikke sendes. Prøv igjen.";

export const OFFER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Sendt",
  ACCEPTED: "Akseptert",
  REJECTED: "Avslått",
  WITHDRAWN: "Trukket",
  EXPIRED: "Utløpt",
};

export function offerStatusLabelNb(status: string): string {
  return OFFER_STATUS_LABELS[status] ?? status;
}

export function canShowOfferSuccess(input: {
  sentOfferId: string | null | undefined;
  confirmedOfferId: string | null | undefined;
}): boolean {
  return Boolean(
    input.sentOfferId &&
      input.confirmedOfferId &&
      input.sentOfferId === input.confirmedOfferId,
  );
}

export type OfferFormFields = {
  amount: string;
  message: string;
};

export function offerSendFailureState(
  error: unknown,
  fields: OfferFormFields,
): {
  error: string;
  highlights?: string[];
  fields: OfferFormFields;
} {
  if (error instanceof LeakFilterError) {
    return {
      error: error.message,
      highlights: error.leaks.map((leak) => leak.excerpt),
      fields,
    };
  }
  if (error instanceof AuthzError) {
    return { error: error.message, fields };
  }
  return { error: OFFER_SEND_FAILED, fields };
}
