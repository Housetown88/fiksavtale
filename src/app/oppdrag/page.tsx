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
        <label className="grid gap-1">
          <span className="label" htmlFor="job-search">
            Søk
          </span>
          <input className="field" id="job-search" name="q" placeholder="Søk" defaultValue={params.q} />
        </label>
        <label className="grid gap-1">
          <span className="label" htmlFor="job-category-filter">
            Fag
          </span>
          <select className="field" id="job-category-filter" name="category" defaultValue={params.category ?? ""}>
            <option value="">Alle fag</option>
            {JOB_CATEGORIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="label" htmlFor="job-area-filter">
            Område
          </span>
          <select className="field" id="job-area-filter" name="area" defaultValue={params.area ?? ""}>
            <option value="">Hele Oslo</option>
            {OSLO_AREAS.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary self-end" type="submit">
          Filtrer
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} showDescription />
        ))}
      </div>
      {jobs.length === 0 ? <p className="text-ink-soft">Ingen treff. Prøv et annet filter.</p> : null}
    </div>
  );
}
