import { PageTitle } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Personvern (utkast)">
        <span className="rounded-[var(--radius-lg)] bg-copper/10 px-3 py-1 text-sm text-copper-deep">
          Utkast — innsyn/sletting/eksport er ikke i v1
        </span>
      </PageTitle>
      <p>
        Avklar behandlingsgrunnlag, lagringstid og databehandleravtaler med advokat før produksjon. GDPR-krav er
        ikke ferdig implementert i prototypen.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Vi lagrer konto, oppdrag, meldinger, bookinger og betalingsstatus i en lokal SQLite-base.</li>
        <li>Eksakt adresse, telefon og e-post er tilgangsstyrt på serveren.</li>
        <li>Admin kan se rapporter og revisjonslogg.</li>
        <li>
          Innsyn, sletting og eksport er ikke bygget i v1. Bruk{" "}
          <a href="/kontakt" className="underline">
            kontaktskjemaet
          </a>{" "}
          for å be om hjelp manuelt.
        </li>
      </ul>
    </article>
  );
}
