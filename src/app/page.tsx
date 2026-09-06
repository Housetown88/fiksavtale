import Link from "next/link";
import { db } from "@/lib/db";
import { JobCard } from "@/components/ui";
import { DatabaseStatus } from "@/components/DatabaseStatus";
import { formatNok, DEFAULT_PLATFORM_FEE_BPS, calcCommission } from "@/lib/money";
import { getPlatformFeeBps } from "@/lib/settings";
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
  }[] = [];
  let feeBps = DEFAULT_PLATFORM_FEE_BPS;
  let dbError: string | null = null;

  const availability = canUseDatabase();
  if (!availability.ok) {
    dbError = availability.message;
  } else {
    try {
      await maybeSeedDemo(db);
      jobs = await db.job.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      feeBps = await getPlatformFeeBps(db);
    } catch {
      dbError =
        "Kunne ikke hente oppdrag akkurat nå. Sjekk at DATABASE_URL peker på Neon eller Turso, og at tabellene er opprettet med npm run db:push.";
    }
  }

  const example = calcCommission(500_000, feeBps);

  return (
    <div className="space-y-12">
      <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Norsk tjenesteavtale</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Avtale først.<br />Kontakt etter betaling.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Jobbenmin er en markedsplass der kunder legger ut jobb, verifiserte bedrifter gir tilbud, og
            partene snakker i appen. Telefon, e-post og eksakt adresse låses opp først når betalingen er
            bekreftet på serveren — ikke av en suksess-side alene.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/registrer" className="btn btn-primary">
              Opprett konto
            </Link>
            <Link href="/oppdrag" className="btn btn-secondary">
              Se åpne oppdrag
            </Link>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-sm font-semibold text-copper">DEMO-gebyr</p>
          <p className="mt-2 font-serif text-2xl">5 000 NOK jobb</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Plattformgebyr ({feeBps / 100}%): {formatNok(example.platformFeeOre)}</li>
            <li>Til bedriften: {formatNok(example.providerPayoutOre)}</li>
          </ul>
          <p className="mt-4 text-xs text-ink-soft">
            Før kortgebyr og MVA. Ingen ekte escrow — se README og ARCHITECTURE.md.
          </p>
        </div>
      </section>

      {dbError ? <DatabaseStatus message={dbError} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["1. Legg ut eller gi tilbud", "Gratis å registrere, legge ut og by. Bedrifter oppgir org.nr."],
          ["2. Snakk i appen", "Chat uten telefon og lenker. Filteret stopper omgåelse, og du kan rette teksten."],
          ["3. Betal, så åpnes kontakt", "Først etter webhook `payment.succeeded` vises telefon, e-post og adresse."],
        ].map(([title, body]) => (
          <div key={title} className="card p-5">
            <h2 className="font-serif text-xl">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{body}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Åpne oppdrag i Oslo</h2>
          <Link href="/oppdrag" className="text-sm font-semibold text-moss">
            Alle oppdrag
          </Link>
        </div>
        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : !dbError ? (
          <p className="text-ink-soft">Ingen åpne oppdrag ennå. Logg inn som kunde og legg ut det første.</p>
        ) : null}
      </section>
    </div>
  );
}
