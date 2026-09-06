import { db } from "@/lib/db";
import { JobCard, PageTitle } from "@/components/ui";
import { DatabaseStatus } from "@/components/DatabaseStatus";
import { JOB_CATEGORIES, OSLO_AREAS } from "@/lib/categories";
import { maybeSeedDemo } from "@/lib/demo-seed";
import { canUseDatabase } from "@/lib/database-url";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; area?: string }>;
}) {
  const params = await searchParams;
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
  let dbError: string | null = null;
  const availability = canUseDatabase();
  if (!availability.ok) {
    dbError = availability.message;
  } else {
    try {
      await maybeSeedDemo(db);
      jobs = await db.job.findMany({
        where: {
          status: "OPEN",
          category: params.category || undefined,
          area: params.area || undefined,
          OR: params.q
            ? [
                { title: { contains: params.q } },
                { description: { contains: params.q } },
              ]
            : undefined,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      dbError = "Kunne ikke hente oppdrag. Databasen er utilgjengelig eller ikke klargjort.";
    }
  }

  return (
    <div>
      <PageTitle kicker="Markedsplass" title="Åpne oppdrag">
        Område vises, men eksakt gateadresse er skjult til betalingen er bekreftet.
      </PageTitle>
      {dbError ? <DatabaseStatus message={dbError} /> : null}
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-4" method="get">
        <input className="field" name="q" placeholder="Søk" defaultValue={params.q} />
        <select className="field" name="category" defaultValue={params.category ?? ""}>
          <option value="">Alle fag</option>
          {JOB_CATEGORIES.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
        <select className="field" name="area" defaultValue={params.area ?? ""}>
          <option value="">Hele Oslo</option>
          {OSLO_AREAS.map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          Filtrer
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {jobs.length === 0 ? <p className="text-ink-soft">Ingen treff. Prøv et annet filter.</p> : null}
    </div>
  );
}
