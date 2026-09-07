import { PageTitle } from "@/components/ui";

export default function MilestonesPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle kicker="Planlagt" title="Milepælsbetaling" />
      <p>Ikke implementert i MVP. Tenkt flyt:</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Partene avtaler delbetalinger (f.eks. 30/40/30) i appen.</li>
        <li>Hver del bruker planlagt Vipps-delbetaling — ikke ferdig i preview.</li>
        <li>Kontakt låses opp etter første bekreftede del, eller etter avtalt terskel.</li>
        <li>Oppgjør til bedrift skjer per bekreftet del via Vipps. Jobbenmin oppbevarer ikke oppdragspengene.</li>
      </ol>
      <p className="text-sm text-ink-soft">
        Ekte delt betaling / Connect-utbetaling krever juridisk og økonomisk gjennomgang.
      </p>
    </article>
  );
}
