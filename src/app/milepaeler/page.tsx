import { PageTitle } from "@/components/ui";

export default function MilestonesPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle kicker="Planlagt" title="Milepælsbetaling" />
      <p>Ikke implementert i MVP. Tenkt flyt:</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Partene avtaler delbetalinger (f.eks. 30/40/30) i appen.</li>
        <li>Hver del oppretter en egen betalingsintensjon.</li>
        <li>Kontakt låses opp etter første bekreftede delbetaling, eller etter avtalt terskel.</li>
        <li>Utbetaling til bedrift skjer per bekreftet del — uten at plattformen holder kundens penger.</li>
      </ol>
      <p className="text-sm text-ink-soft">
        Ekte delt betaling / Connect-utbetaling krever juridisk og økonomisk gjennomgang.
      </p>
    </article>
  );
}
