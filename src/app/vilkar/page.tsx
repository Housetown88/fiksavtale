import { PageTitle } from "@/components/ui";

export default function TermsPage() {
  return (
    <article className="prose-like mx-auto max-w-2xl space-y-4">
      <PageTitle title="Vilkår (produktutkast)">
        <span className="rounded-[var(--radius-lg)] bg-copper/10 px-3 py-1 text-sm text-copper-deep">
          Utkast — ikke juridisk godkjent. [Firmanavn], [org.nr] og [forretningsadresse] fylles inn av
          eier.
        </span>
      </PageTitle>
      <p>
        Dette utkastet beskriver hvordan Jobbenmin faktisk virker i preview/DEMO, og hvilken
        betalingsmodell som er valgt for videre arbeid. Teksten er ikke gjennomgått av advokat og er
        ikke en bindende avtale.
      </p>
      <h2 className="font-serif text-xl">1. Hva tjenesten er</h2>
      <p>
        Jobbenmin formidler kontakt mellom privatkunder og registrerte bedrifter. Plattformen utfører
        ikke arbeidet. Registrering, utlegging av oppdrag og tilbud er gratis.
      </p>
      <h2 className="font-serif text-xl">2. Pris og provisjon</h2>
      <p>
        Kunden betaler den avtalte jobbprisen (pluss eventuelle betalte tillegg). Jobbenmin tjener en
        konfigurerbar provisjon (standard 10 %) av beløp som finansieres gjennom plattformen.
        Provisjonen registreres automatisk i oppgjørsboken når betalingen bekreftes. Kunden ser
        totalen. Firmaet ser gebyr og forventet oppgjør. Gebyret faktureres ikke i etterkant.
      </p>
      <h2 className="font-serif text-xl">3. Betaling og kontakt</h2>
      <p>
        Kunden finansierer før arbeidet. Kontakt (telefon, e-post, eksakt adresse) låses opp først når
        serveren har bekreftet finansiering. En retur-URL alene åpner ikke kontakt. Firmaets oppgjør
        forfaller etter kundens godkjenning eller avtalt frist.
      </p>
      <p>
        I preview er betaling DEMO. Anbefalt live-løsning er at Jobbenmin er én Vipps-selger
        (single-merchant): kunden betaler plattformen, provisjon tas i samme løp, og firmaet får
        oppgjør etter godkjenning. Vipps MobilePay støtter ikke gebyrsplitt i selve betalingen.
        Live-nøkler, handelsavtale og eventuell tillatelse til å motta midler på vegne av andre
        mangler. Dette er ikke live.
      </p>
      <h2 className="font-serif text-xl">4. Avbestilling og refusjon</h2>
      <p>
        Før finansiering kan bookingen avbestilles uten trekk. Etter finansiering og før start
        registreres full DEMO-refusjon og provisjonen justeres. Etter start åpnes tvist, og oppgjør
        holdes. Ekte Vipps-refusjon er ikke koblet.
      </p>
      <h2 className="font-serif text-xl">5. Ansvar</h2>
      <p>
        Partene er selv ansvarlige for arbeidet, forsikring og forbrukerrettigheter. Angrerett og
        håndverkertjenesteloven må avklares med advokat før produksjon. Når kontakt først er delt, kan
        den ikke gjøres usett.
      </p>
    </article>
  );
}
