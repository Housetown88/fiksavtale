import Link from "next/link";
import { db } from "@/lib/db";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function AdminJobsPage() {
  const jobs = await db.job.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Oppdrag" />
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link key={job.id} href={`/oppdrag/${job.id}`} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-sm text-ink-soft">{job.customer.name} · {job.area}</p>
            </div>
            <StatusBadge status={job.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
