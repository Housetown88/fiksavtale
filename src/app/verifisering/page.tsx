import { PageTitle } from "@/components/ui";

export default function VerificationPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Hva «Org.nr format OK» betyr" />
      <p className="rounded-[var(--radius-lg)] bg-copper/10 px-4 py-3 text-sm text-copper-deep">
        Utkast. Merket er format- og kontrollsifferkontroll — ikke et oppslag i Brønnøysund.
      </p>
      <p>
        Merket betyr at organisasjonsnummeret har gyldig 9-sifret format og korrekt kontrollsiffer. Det
        gjøres ingen oppslag mot Brønnøysundregistrene, Skatteetaten eller autorisasjonsregistre.
      </p>
      <p>
        Vi sjekker ikke fagbrev, ansvarsforsikring, politiattest eller kreditthistorikk. Ikke les merket som
        «godkjent håndverker».
      </p>
    </article>
  );
}
