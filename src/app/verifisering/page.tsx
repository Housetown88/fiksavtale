import { PageTitle } from "@/components/ui";

export default function VerificationPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Hva «Org.nr sjekket» betyr" />
      <p>
        Merket betyr at organisasjonsnummeret har gyldig 9-sifret format og korrekt kontrollsiffer. I DEMO gjøres
        det ingen oppslag mot Brønnøysundregistrene, Skatteetaten eller autorisasjonsregistre.
      </p>
      <p>
        Vi sjekker ikke fagbrev, ansvarsforsikring, politiattest eller kreditthistorikk. Ikke les merket som
        «godkjent håndverker».
      </p>
    </article>
  );
}
