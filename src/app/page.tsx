import Link from "next/link";
import { db } from "@/lib/db";
import { JobCard, SectionHeader } from "@/components/ui";
import { CategoryGrid } from "@/components/CategoryGrid";
import { DatabaseStatus } from "@/components/DatabaseStatus";
import { DemoNowCopy, PaymentPlanBadge, PlannedVippsCustomerCopy } from "@/components/PaymentCopy";
import { maybeSeedDemo } from "@/lib/demo-seed";
import { canUseDatabase } from "@/lib/database-url";

export default async function HomePage() {
  let jobs: {
    id: string;
    title: string;
    description: string;
    category: string;
    area: string;
    budgetMinOre: number | null;
    budgetMaxOre: number | null;
    status: string;
    createdAt: Date;
    offerCount: number;
  }[] = [];
  let dbError: string | null = null;

  const availability = canUseDatabase();
  if (!availability.ok) {
    dbError = availability.message;
  } else {
    try {
      await maybeSeedDemo(db);
      const rows = await db.job.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { _count: { select: { offers: true } } },
      });
      jobs = rows.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        category: job.category,
        area: job.area,
        budgetMinOre: job.budgetMinOre,
        budgetMaxOre: job.budgetMaxOre,
        status: job.status,
        createdAt: job.createdAt,
        offerCount: job._count.offers,
      }));
    } catch {
      dbError =
        "Kunne ikke hente oppdrag akkurat nå. Sjekk at DATABASE_URL peker på Neon eller Turso, og at tabellene er opprettet med npm run db:push.";
    }
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div>
          <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            Få jobben gjort.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Legg ut jobben gratis og få tilbud fra lokale bedrifter.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/oppdrag/nytt" className="btn btn-copper">
              Legg ut en jobb
            </Link>
            <Link href="/oppdrag" className="btn btn-primary">
              Finn oppdrag
            </Link>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-ink-soft">
            {["Bedrifter med org.nr", "Betaling i appen (DEMO nå)", "Chat og avtale før kontakt"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-moss" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">Avtale først. Kontakt etter betaling.</p>
        </div>
        <div className="card p-6">
          <p className="kicker">Slik starter du</p>
          <ol className="mt-4 space-y-3 text-sm">
            <li>
              <span className="font-semibold text-ink">1. Beskriv jobben</span>
              <p className="text-ink-soft">Gratis å legge ut. Område vises, ikke gateadresse.</p>
            </li>
            <li>
              <span className="font-semibold text-ink">2. Sammenlign tilbud</span>
              <p className="text-ink-soft">Lokale bedrifter svarer i appen.</p>
            </li>
            <li>
              <span className="font-semibold text-ink">3. Book og betal</span>
              <p className="text-ink-soft">Kontakt åpnes når bookingen er betalt.</p>
            </li>
          </ol>
        </div>
      </section>

      {dbError ? <DatabaseStatus message={dbError} /> : null}

      <section>
        <SectionHeader title="Åpne oppdrag" href="/oppdrag" linkLabel="Se alle oppdrag →" />
        {jobs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : !dbError ? (
          <p className="text-ink-soft">Ingen åpne oppdrag ennå. Logg inn som kunde og legg ut det første.</p>
        ) : null}
      </section>

      <section>
        <SectionHeader title="Populære fag" href="/oppdrag" linkLabel="Alle oppdrag →" />
        <CategoryGrid />
      </section>

      <section>
        <SectionHeader title="Slik fungerer det" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1. Legg ut jobben",
              "Beskriv hva som skal gjøres. Det er gratis, og du oppgir bare synlig område — ikke telefon.",
            ],
            [
              "2. Motta tilbud",
              "Lokale bedrifter med org.nr gir pris. Dere snakker i appen til dere er enige.",
            ],
            [
              "3. Velg og betal",
              "Velg et tilbud og betal i appen. Da åpnes telefon, e-post og adresse.",
            ],
          ].map(([title, body]) => (
            <div key={title} className="card p-5">
              <h3 className="font-serif text-xl tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["For bedrifter: Finn oppdrag", "Se åpne jobber i Oslo og filtrer på fag."],
            ["Gi tilbud", "Kunden ser totalen. Dere ser gebyr før dere sender."],
            ["Gjør jobben", "Kontakt deles når bookingen er betalt. Oppgjør via Vipps er planlagt."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[var(--radius-lg)] border border-line/80 bg-sand/40 p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-2xl tracking-tight">Trygg betaling</h2>
          <PaymentPlanBadge />
        </div>
        <div className="mt-3 max-w-2xl space-y-3 text-sm text-ink-soft">
          <DemoNowCopy />
          <PlannedVippsCustomerCopy />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/avbestilling" className="font-semibold text-moss hover:underline">
            Avbestilling og reklamasjon
          </Link>
        </p>
      </section>
    </div>
  );
}
