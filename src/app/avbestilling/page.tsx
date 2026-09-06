import { PageTitle } from "@/components/ui";

export default function CancelPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Avbestilling, udeblivelse og tillegg" />
      <p className="text-sm text-ink-soft">
        Reglene under er produktantakelser for prototypen, ikke en ferdig forbrukerrettslig vurdering.
        Skill mellom det som finnes i preview og det som er planlagt med Vipps.
      </p>
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong>Før capture / før ekte trekk:</strong> Kunden kan avvise tilbud eller avbestille
          bookingen. Planlagt med Vipps: reservasjonen frigis, og ingen trekk skjer. I DEMO: ingen
          penger er i bevegelse — status settes til avbrutt.
        </li>
        <li>
          <strong>Etter capture, før arbeid er startet:</strong> Avbestilling skal gi refusjon etter
          avtalte regler. I DEMO er «refusjon» bare en manuell/statusendring; ekte tilbakebetaling er
          ikke koblet ennå.
        </li>
        <li>
          <strong>Etter at arbeidet er startet:</strong> Forholdsmessig oppgjør eller tvist. Angrerett
          gjelder der loven krever det — dette er ikke avklart juridisk i prototypen. Automatisk gebyr
          ved udeblivelse er ikke implementert.
        </li>
        <li>
          <strong>Kontakt som er delt:</strong> Når telefon, e-post eller eksakt adresse først er låst
          opp, kan opplysningene ikke gjøres usett. Misbruk kan rapporteres.
        </li>
        <li>
          <strong>Milepæler / delcapture og tillegg:</strong> Planlagt, ikke ferdig. Ekstra arbeid skal
          foreslås og godkjennes i appen, men godkjente tillegg er ikke koplet til et nytt
          betalingsløp ennå.
        </li>
        <li>
          <strong>Hva preview faktisk gjør:</strong> DEMO-webhook (`payment.succeeded`) merker
          bookingen som betalt og låser opp kontakt. Vipps reserve/capture, automatisk
          godkjenningsfrist og ekte refusjon er ikke live. Jobbenmin er ikke bank og oppbevarer ikke
          oppdragspengene.
        </li>
        <li>
          <strong>Reklamasjon / tvist:</strong> Booking kan settes i tvist av admin. Forbrukerkjøpsloven
          og håndverkertjenesteloven må avklares med advokat.
        </li>
      </ol>
    </article>
  );
}
