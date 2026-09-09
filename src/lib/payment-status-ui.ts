import { isTerminalBookingStatus } from "./booking-totals";

export type PaymentConfirmView = {
  title: string;
  body: string;
  nextAction: string;
  tone: "ok" | "warn" | "info";
  showRetry: boolean;
  showSimulate: boolean;
};

function isFinancedStatus(status: string): boolean {
  return status === "PAID" || status === "IN_PROGRESS" || status === "COMPLETED";
}

export function isExtraPaymentView(input: {
  extraCharge?: boolean;
  extraChargeId?: string | null;
  intentKind?: string | null;
}): boolean {
  return Boolean(input.extraCharge || input.extraChargeId || input.intentKind === "EXTRA");
}

/** Ikke vis «Bekreftet» for intensjon når bookingen fortsatt venter betaling. */
export function demoIntentBadgeStatus(input: {
  intentStatus?: string | null;
  bookingStatus: string;
  contactUnlocked: boolean;
  extraCharge?: boolean;
  extraChargeStatus?: string | null;
}): string {
  const intent = input.intentStatus ?? "PENDING";
  if (intent !== "SUCCEEDED") return intent;
  if (isExtraPaymentView(input)) {
    return input.extraChargeStatus === "PAID" ? "SUCCEEDED" : "PENDING";
  }
  if (isFinancedStatus(input.bookingStatus)) return "SUCCEEDED";
  return "PENDING";
}

export function paymentConfirmView(input: {
  bookingStatus: string;
  intentStatus?: string | null;
  contactUnlocked: boolean;
  extraCharge?: boolean;
  extraChargeStatus?: string | null;
  extraChargeId?: string | null;
  intentKind?: string | null;
}): PaymentConfirmView {
  const intent = input.intentStatus ?? "PENDING";
  const extra = isExtraPaymentView(input);
  const extraPaid = input.extraChargeStatus === "PAID";
  const extraApprovedUnpaid = extra && input.extraChargeStatus === "APPROVED";
  const financed = isFinancedStatus(input.bookingStatus);
  const closed = isTerminalBookingStatus(input.bookingStatus);

  if (extra) {
    if (extraPaid) {
      return {
        title: "Tillegget er bekreftet",
        body: "Tillegget er merket som betalt, og provisjonen er registrert automatisk.",
        nextAction: "Gå tilbake til bookingen for å se oppdatert total.",
        tone: "ok",
        showRetry: false,
        showSimulate: false,
      };
    }

    if (closed) {
      const closedCopy =
        input.bookingStatus === "REFUNDED"
          ? {
              title: "Bookingen er refundert",
              body: "Tillegget kan ikke betales. Ventende betalingsøkter er ugyldige etter refusjon. Ingen ny finansiering eller provisjon registreres.",
            }
          : input.bookingStatus === "DISPUTED"
            ? {
                title: "Bookingen er i tvist",
                body: "Tillegget kan ikke betales mens bookingen er i tvist. Ventende betalingsøkter er ugyldige. Ingen ny finansiering eller provisjon registreres.",
              }
            : input.bookingStatus === "COMPLETED"
              ? {
                  title: "Arbeidet er allerede fullført",
                  body: "Tillegget kan ikke betales på en fullført booking.",
                }
              : {
                  title: "Bookingen er avbestilt",
                  body: "Tillegget kan ikke betales. Ventende betalingsøkter er ugyldige etter avbestilling.",
                };
      return {
        ...closedCopy,
        nextAction: "Gå tilbake til bookingen. DEMO — ingen ekte Vipps-trekk.",
        tone: "warn",
        showRetry: false,
        showSimulate: false,
      };
    }

    if (intent === "FAILED") {
      return {
        title: "Betaling av tillegget feilet",
        body: "Ingen beløp er belastet. Du kan prøve på nytt.",
        nextAction: "Trykk på Prøv igjen når du er klar.",
        tone: "warn",
        showRetry: true,
        showSimulate: false,
      };
    }

    if (intent === "CANCELLED") {
      return {
        title: "Betaling av tillegget ble avbrutt",
        body: "Ingen beløp er belastet. Du kan starte på nytt når du er klar.",
        nextAction: "Trykk på Prøv igjen for å starte en ny DEMO-betaling.",
        tone: "warn",
        showRetry: true,
        showSimulate: false,
      };
    }

    if (intent === "EXPIRED") {
      return {
        title: "Reservasjonen for tillegget er utløpt",
        body: "Tidsfristen for denne betalingsøkten er over. Ingen beløp er belastet.",
        nextAction: "Start en ny DEMO-betaling fra bookingen.",
        tone: "warn",
        showRetry: true,
        showSimulate: false,
      };
    }

    return {
      title: "Betaling av tillegget er ikke ferdig ennå",
      body: "Godkjenning alene betaler ikke tillegget. Bekreft DEMO-betalingen under. Hovedjobben kan allerede være finansiert — det betyr ikke at tillegget er betalt.",
      nextAction: extraApprovedUnpaid
        ? "Bekreft DEMO-betalingen under slik at tillegget blir merket betalt."
        : "Gå tilbake til bookingen for å starte en ny DEMO-betaling av tillegget.",
      tone: "info",
      showSimulate: Boolean(extraApprovedUnpaid),
      showRetry: false,
    };
  }

  if (financed && (intent === "SUCCEEDED" || input.contactUnlocked)) {
    return {
      title: "Betalingen er bekreftet",
      body: input.contactUnlocked
        ? "Bookingen er finansiert. Kontakt er låst opp for partene. Provisjon er registrert automatisk."
        : "Bookingen er merket som finansiert. Kontakt vises når serveren har bekreftet betalingen.",
      nextAction: "Åpne bookingen for å se kontakt og neste steg.",
      tone: "ok",
      showRetry: false,
      showSimulate: false,
    };
  }

  if (closed) {
    const closedCopy =
      input.bookingStatus === "REFUNDED"
        ? {
            title: "Bookingen er refundert",
            body: "Betalingen kan ikke bekreftes. Ventende betalingsøkter er ugyldige etter refusjon.",
          }
        : input.bookingStatus === "DISPUTED"
          ? {
              title: "Bookingen er i tvist",
              body: "Betalingen kan ikke bekreftes mens bookingen er i tvist.",
            }
          : input.bookingStatus === "COMPLETED"
            ? {
                title: "Arbeidet er allerede fullført",
                body: "Betalingen kan ikke bekreftes på en fullført booking.",
              }
            : {
                title: "Bookingen er avbestilt",
                body: "Betalingen kan ikke bekreftes. Ventende betalingsøkter er ugyldige etter avbestilling.",
              };
    return {
      ...closedCopy,
      nextAction: "Gå tilbake til bookingen. DEMO — ingen ekte Vipps-trekk.",
      tone: "warn",
      showRetry: false,
      showSimulate: false,
    };
  }

  if (intent === "SUCCEEDED" && !financed) {
    return {
      title: "Betalingen er ikke ferdig ennå",
      body: "DEMO-økten er merket bekreftet, men bookingen er ikke finansiert. Kontakt forblir låst til bookingen er satt til betalt.",
      nextAction: "Bekreft DEMO-betalingen under slik at bookingen blir finansiert.",
      tone: "warn",
      showRetry: false,
      showSimulate: true,
    };
  }

  if (intent === "FAILED") {
    return {
      title: "Betalingen feilet",
      body: "Ingen beløp er belastet. Du kan prøve på nytt.",
      nextAction: "Trykk på Prøv igjen når du er klar.",
      tone: "warn",
      showRetry: true,
      showSimulate: false,
    };
  }

  if (intent === "CANCELLED") {
    return {
      title: "Betalingen ble avbrutt",
      body: "Ingen beløp er belastet. Du kan starte på nytt når du er klar.",
      nextAction: "Trykk på Prøv igjen for å starte en ny DEMO-betaling.",
      tone: "warn",
      showRetry: true,
      showSimulate: false,
    };
  }

  if (intent === "EXPIRED") {
    return {
      title: "Reservasjonen er utløpt",
      body: "Tidsfristen for denne betalingsøkten er over. Ingen beløp er belastet.",
      nextAction: "Start en ny DEMO-betaling fra bookingen.",
      tone: "warn",
      showRetry: true,
      showSimulate: false,
    };
  }

  return {
    title: "Betalingen er ikke ferdig ennå",
    body: "Denne siden alene åpner ikke kontakt. Bekreft DEMO-betalingen under.",
    nextAction: "Bekreft, simuler feilet eller avbrutt — deretter neste steg.",
    tone: "info",
    showSimulate: true,
    showRetry: false,
  };
}
