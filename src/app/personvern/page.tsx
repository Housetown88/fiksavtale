import Link from "next/link";
import { PageTitle } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Personvern (produktutkast)">
        <span className="rounded-[var(--radius-lg)] bg-copper/10 px-3 py-1 text-sm text-copper-deep">
          Utkast — behandlingsansvarlig [Firmanavn], [org.nr] er ikke fylt inn. Ikke juridisk godkjent.
        </span>
      </PageTitle>
      <p>
        Personopplysningsloven og GDPR krever behandlingsgrunnlag, lagringstid og databehandleravtaler.
        Dette utkastet speiler hva prototypen faktisk lagrer. Kilder: personopplysningsloven og
        Datatilsynets veiledning om innsyn, eksport og sletting. Eier må bekrefte før produksjon.
      </p>
      <h2 className="font-serif text-xl">Hva vi samler inn</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Konto: navn, e-post, passordhash, telefon, rolle.</li>
        <li>Kundeprofil: adresse, postnummer, sted, område — for å beskrive jobben og låse opp kontakt.</li>
        <li>Firmaprofil: firmanavn, org.nr, omtaletekst, områder, fakturae-post.</li>
        <li>Oppdrag, bilder, tilbud, chat, bookinger, tillegg, betalingsstatus og oppgjørsbok.</li>
        <li>Rapporter, revisjonslogg, kontaktskjema og tilbakestillingstokener (hash).</li>
      </ul>
      <h2 className="font-serif text-xl">Hvorfor og hvem</h2>
      <p className="text-sm">
        Formål: formidle oppdrag, ta imot tilbud, finansiere jobber, beregne provisjon, låse opp
        kontakt etter betaling, og håndtere support/tvister. Mottakere: partene etter opplåsing, admin
        for moderasjon, og (når satt) e-postleverandør for passordlenker. Live betalingspartner er
        ikke koblet.
      </p>
      <h2 className="font-serif text-xl">Innsyn, eksport og sletting</h2>
      <p className="text-sm">
        Innloggede brukere kan be om innsyn, eksport og sletting fra{" "}
        <Link href="/konto" className="underline">
          konto
        </Link>
        . Eksport laster ned dine egne data. Sletting anonymiserer profil og chat, men beløp,
        provisjon, oppgjørsbok og tviststatus beholdes for regnskap og eventuelle tvister. Admin
        behandler køen. Dette er en praktisk flyt, ikke en ferdig GDPR-vurdering.
      </p>
      <h2 className="font-serif text-xl">Lagring</h2>
      <p className="text-sm">
        Data ligger i databasen som er konfigurert for miljøet (lokal SQLite eller Neon/Turso).
        Bildene re-kodes uten EXIF/GPS. Passord og tilbakestillingstokener lagres som hash.
      </p>
    </article>
  );
}
