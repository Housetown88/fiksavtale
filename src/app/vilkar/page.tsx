import { PageTitle } from "@/components/ui";

export default function TermsPage() {
  return (
    <article className="prose-like mx-auto max-w-2xl space-y-4">
      <PageTitle title="Vilkår (utkast, ikke juridisk råd)">
        <span className="rounded-[var(--radius-lg)] bg-copper/10 px-3 py-1 text-sm text-copper-deep">
          Utkast — ikke ferdig juridisk tekst
        </span>
      </PageTitle>
      <p>
        Dette er et arbeidsutkast for prototypen Jobbenmin. Teksten er ikke gjennomgått av advokat og skal ikke
        behandles som gjeldende avtalevilkår.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Plattformen formidler kontakt mellom kunde og bedrift. Vi utfører ikke arbeidet.</li>
        <li>
          Registrering, utlegging og tilbud er gratis. Kunden betaler jobbprisen. Plattformgebyr (typisk
          10 %) avregnes med firmaet etter avtale — vanligvis faktura, ikke automatisk trekk fra Vipps
          i denne versjonen.
        </li>
        <li>Direkte kontakt og eksakt adresse låses til betalt booking.</li>
        <li>Når kontakt først er låst opp, kan den ikke gjøres usett.</li>
        <li>
          DEMO-betaling er simulert. Planlagt: Vipps reserverer beløpet og trekker ved godkjenning.
          Jobbenmin er ikke bank og oppbevarer ikke oppdragspengene. Ekte betalingsavtale må avklares
          før produksjon.
        </li>
      </ul>
    </article>
  );
}
