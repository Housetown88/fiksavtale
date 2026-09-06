import { PageTitle } from "@/components/ui";

export default function SiteVisitPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle kicker="Planlagt" title="Befaring" />
      <p>Ikke implementert i MVP. Tenkt flyt:</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Bedrift foreslår befaringstid i chatten (uten å bytte telefon).</li>
        <li>Kunden godkjenner. En midlertidig, tidsavgrenset adresse kan vises for befaringen.</li>
        <li>Etter befaring sendes endelig fastpristilbud.</li>
        <li>Full kontakt låses fortsatt først etter betalt booking.</li>
      </ol>
    </article>
  );
}
