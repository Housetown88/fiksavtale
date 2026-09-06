import { PageTitle } from "@/components/ui";

export default function CancelPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Avbestilling, udeblivelse og tillegg" />
      <p className="text-sm text-ink-soft">
        Reglene under er produktantakelser for prototypen, ikke en ferdig forbrukerrettslig vurdering.
      </p>
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong>Før betaling:</strong> Kunden kan avvise tilbud eller avbestille bookingen uten gebyr. Ingen
          kontakt er låst opp.
        </li>
        <li>
          <strong>Etter betaling, før arbeid:</strong> Partene kan avbestille i appen. Refusjon er manuell i DEMO
          (status settes til avbrutt; ekte tilbakebetaling finnes ikke).
        </li>
        <li>
          <strong>Etter at kontakt er låst opp:</strong> Opplysningene kan ikke gjøres usett. Misbruk kan rapporteres.
        </li>
        <li>
          <strong>Udeblivelse:</strong> Meld fra via rapportknappen. Admin vurderer saken. Automatisk gebyr er ikke
          implementert.
        </li>
        <li>
          <strong>Tillegg:</strong> Ekstra arbeid skal foreslås og godkjennes i appen før det utføres. Godkjente
          tillegg er foreløpig ikke koplet til et nytt betalingsløp (planlagt).
        </li>
        <li>
          <strong>Reklamasjon / tvist:</strong> Booking kan settes i tvist av admin. Forbrukerkjøpsloven og
          håndverkertjenesteloven må avklares med advokat.
        </li>
      </ol>
    </article>
  );
}
