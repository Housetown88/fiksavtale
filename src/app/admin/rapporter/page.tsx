import { db } from "@/lib/db";
import { adminReviewReportAction } from "@/app/actions";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function AdminReportsPage() {
  const reports = await db.report.findMany({
    include: { reporter: true, targetUser: true, targetJob: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Rapporter" />
      <div className="space-y-2">
        {reports.map((report) => (
          <div key={report.id} className="card p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{report.reason}</p>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-1">Fra {report.reporter.name}</p>
            <p>{report.details}</p>
            {report.status === "OPEN" ? (
              <div className="mt-3 flex gap-2">
                <form action={adminReviewReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="status" value="REVIEWED" />
                  <button className="btn btn-primary px-3 py-1 text-xs">Marker behandlet</button>
                </form>
                <form action={adminReviewReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="status" value="DISMISSED" />
                  <button className="btn btn-secondary px-3 py-1 text-xs">Avvis</button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
