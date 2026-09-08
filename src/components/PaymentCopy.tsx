import Link from "next/link";

/** Planned Vipps reserve/capture copy. Never claims live Vipps, escrow, or fee split in Vipps. */

export function PaymentPlanBadge() {
  return (
    <span className="inline-flex rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-pine">
      DEMO nå · Vipps ikke live
    </span>
  );
}

export function DemoNowCopy() {
  return (
    <p>
      I preview bruker vi DEMO — ingen ekte trekk. Provisjon registreres automatisk i
      oppgjørsboken når finansiering bekreftes.
    </p>
  );
}

export function PlannedVippsCustomerCopy() {
  return (
    <p>
      Anbefalt live-modell: du betaler jobbprisen til Jobbenmin som én Vipps-betaling
      (reserver, deretter trekk ved godkjenning eller frist). Provisjonen trekkes automatisk i
      samme løp. Firmaet får oppgjør etter godkjenning. Dette er ikke live. Vipps støtter ikke
      gebyrsplitt i selve betalingen.
    </p>
  );
}

export function PlannedVippsProviderCopy() {
  return (
    <p>
      Når jobben finansieres, registreres provisjonen automatisk. Dere ser gebyr og forventet
      oppgjør med en gang. Live Vipps-utbetaling krever avtale og er ikke koblet. Gebyret
      faktureres ikke i etterkant i denne modellen.
    </p>
  );
}

export function CheckoutPaymentCopy({ amountLabel }: { amountLabel: string }) {
  return (
    <div className="space-y-2 text-sm text-ink-soft">
      <p>
        Du bekrefter finansiering på {amountLabel}. Plattformgebyret trekkes automatisk i
        betalingsløpet. Firmaet ser gebyr og forventet oppgjør. DEMO: ingen ekte betaling.
      </p>
      <p>
        Kontakt åpnes først når serveren har bekreftet finansieringen. En retur-URL alene er
        ikke nok.{" "}
        <Link href="/avbestilling" className="underline">
          Avbestillingsregler
        </Link>
        .
      </p>
    </div>
  );
}
