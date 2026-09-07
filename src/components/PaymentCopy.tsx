import Link from "next/link";

/** Planned Vipps reserve/capture copy. Never claims live Vipps, escrow, or platform-held funds. */

export function PaymentPlanBadge() {
  return (
    <span className="inline-flex rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-pine">
      DEMO nå · Vipps planlagt
    </span>
  );
}

export function DemoNowCopy() {
  return <p>I preview bruker vi DEMO — ingen ekte trekk. Pengene går ikke via Jobbenmin.</p>;
}

export function PlannedVippsCustomerCopy() {
  return (
    <p>
      Når du booker, reserveres beløpet i Vipps. Beløpet trekkes først når du godkjenner jobben, eller
      etter en avtalt frist hvis du ikke svarer. Avbestiller du før trekket, frigjøres reservasjonen.
      Jobbenmin er ikke bank og oppbevarer ikke oppdragspengene for deg.
    </p>
  );
}

export function PlannedVippsProviderCopy() {
  return (
    <p>
      Når Vipps er på plass: beløpet reserveres ved booking. Dere får Vipps-oppgjør når kunden
      godkjenner (eller etter frist). Plattformgebyr avregnes med dere etter avtale — typisk faktura.
    </p>
  );
}

export function CheckoutPaymentCopy({ amountLabel }: { amountLabel: string }) {
  return (
    <div className="space-y-2 text-sm text-ink-soft">
      <p>
        Du godkjenner en reservasjon på {amountLabel} (planlagt med Vipps). Firmaet får oppgjør når
        jobben er godkjent (eller etter frist). Plattformgebyr avregnes med firmaet etter avtalen. DEMO:
        ingen ekte betaling.
      </p>
      <p>
        I preview bekreftes bookingen uten ekte trekk, og kontakt blir synlig når betalingen er merket
        som fullført. Vipps, automatisk frist og refusjon er ikke koblet ennå.{" "}
        <Link href="/avbestilling" className="underline">
          Avbestillingsregler
        </Link>
        .
      </p>
    </div>
  );
}
