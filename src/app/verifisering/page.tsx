import { PageTitle } from "@/components/ui";

export default function VerificationPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Hva bedriftsmerkene betyr" />
      <p className="rounded-[var(--radius-lg)] bg-copper/10 px-4 py-3 text-sm text-copper-deep">
        Merkene viser bare det som faktisk er sjekket. Ingen av dem er faglig godkjenning eller
        signaturrett med mindre det står eksplisitt.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>
          <strong>Org.nr format OK</strong> — 9 siffer og korrekt kontrollsiffer. Ikke et registeroppslag.
        </li>
        <li>
          <strong>Funnet i Enhetsregisteret</strong> — oppslag mot Brønnøysunds åpne API. Navn kan
          stemme eller ikke stemme med det firmaet skrev inn.
        </li>
        <li>
          <strong>Signaturrett</strong> — bare «bekreftet» hvis eier/admin har merket det. Vi sjekker
          ikke Altinn eller firmaattest automatisk.
        </li>
        <li>
          <strong>Faglig godkjenning</strong> — ikke sjekket. Vi slår ikke opp mesterbrev,
          ansvarsrett eller autorisasjon.
        </li>
      </ul>
      <p>
        Kilde for oppslag: Enhetsregisterets åpne API hos Brønnøysundregistrene. Oppslag kan feile
        uten at org.nr er ugyldig.
      </p>
    </article>
  );
}
