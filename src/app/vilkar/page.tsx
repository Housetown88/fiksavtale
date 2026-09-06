import { PageTitle } from "@/components/ui";

export default function TermsPage() {
  return (
    <article className="prose-like mx-auto max-w-2xl space-y-4">
      <PageTitle title="Vilkår (utkast, ikke juridisk råd)" />
      <p>
        Dette er et arbeidsutkast for prototypen Jobbenmin. Teksten er ikke gjennomgått av advokat og skal ikke
        behandles som gjeldende avtalevilkår.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Plattformen formidler kontakt mellom kunde og bedrift. Vi utfører ikke arbeidet.</li>
        <li>Registrering, utlegging og tilbud er gratis. Gebyr tas bare av betalte jobber.</li>
        <li>Direkte kontakt og eksakt adresse låses til serverbekreftet betaling.</li>
        <li>Når kontakt først er låst opp, kan den ikke gjøres usett.</li>
        <li>DEMO-betaling er simulert. Ekte Stripe Connect / PSD2 må avklares med advokat før produksjon.</li>
      </ul>
    </article>
  );
}
