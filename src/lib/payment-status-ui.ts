export type PaymentConfirmView = {
  title: string;
  body: string;
  tone: "ok" | "warn" | "info";
  showRetry: boolean;
  showSimulate: boolean;
};

export function paymentConfirmView(input: {
  bookingStatus: string;
  intentStatus?: string | null;
  contactUnlocked: boolean;
  extraCharge?: boolean;
}): PaymentConfirmView {
  const intent = input.intentStatus ?? "PENDING";
  const extra = Boolean(input.extraCharge);

  if (intent === "SUCCEEDED" || (input.contactUnlocked && !extra) || (extra && intent === "SUCCEEDED")) {
    if (extra) {
      return {
        title: "Tillegget er bekreftet",
        body: "DEMO-betalingen for tillegget er merket som fullført. Tillegget teller nå som betalt. Vipps er ikke live.",
        tone: "ok",
        showRetry: false,
        showSimulate: false,
      };
    }
    if (input.bookingStatus === "PAID" || input.bookingStatus === "IN_PROGRESS" || input.bookingStatus === "COMPLETED") {
      return {
        title: "Betalingen er bekreftet",
        body: input.contactUnlocked
          ? "Bookingen er merket som betalt, og kontakt er låst opp for partene. I preview er dette DEMO — ingen ekte Vipps-trekk."
          : "Bookingen er merket som betalt i DEMO. Kontakt vises når serveren har bekreftet betalingen.",
        tone: "ok",
        showRetry: false,
        showSimulate: false,
      };
    }
  }

  if (intent === "FAILED") {
    return {
      title: extra ? "Betaling av tillegget feilet" : "Betalingen feilet",
      body: "Ingen beløp er belastet i DEMO. Du kan prøve på nytt. Vipps er ikke live.",
      tone: "warn",
      showRetry: true,
      showSimulate: false,
    };
  }

  if (intent === "CANCELLED") {
    return {
      title: extra ? "Betaling av tillegget ble avbrutt" : "Betalingen ble avbrutt",
      body: "Ingen beløp er belastet. Du kan starte DEMO-betalingen på nytt når du er klar.",
      tone: "warn",
      showRetry: true,
      showSimulate: false,
    };
  }

  return {
    title: extra ? "Betaling av tillegget er ikke ferdig ennå" : "Betalingen er ikke ferdig ennå",
    body: extra
      ? "Godkjenning alene betaler ikke tillegget. Bekreft DEMO-betalingen under. Tillegget telles ikke som finansiert før det er merket betalt."
      : "Denne siden alene åpner ikke kontakt. Bekreft DEMO-betalingen under. Vipps er ikke live.",
    tone: "info",
    showRetry: false,
    showSimulate: true,
  };
}
