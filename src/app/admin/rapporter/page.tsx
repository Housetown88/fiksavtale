import Link from "next/link";
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
      <PageTitle title="Rapporter">
        Behandle og logg. Lenke til jobb eller bruker vises når målet finnes.
      </PageTitle>
      <div className="space-y-2">
        {reports.map((report) => (
          <div key={report.id} className="card p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{report.reason}</p>
              <StatusBadge status={report.status} showRaw />
            </div>
            <p className="mt-1">Fra {report.reporter.name}</p>
            <p className="mt-1">
              Mål:{" "}
              {report.targetJob ? (
                <Link href={`/oppdrag/${report.targetJob.id}`} className="font-semibold text-moss underline">
                  Oppdrag — {report.targetJob.title}
                </Link>
              ) : report.targetUser ? (
                <Link
                  href={report.targetUser.role === "PROVIDER" ? `/firma/${report.targetUser.id}` : `/admin/brukere`}
                  className="font-semibold text-moss underline"
                >
                  Bruker — {report.targetUser.name} ({report.targetUser.email})
                </Link>
              ) : (
                "Ikke knyttet"
              )}
            </p>
            <p>{report.details}</p>
            {report.treatmentNote ? (
              <p className="mt-2 text-ink-soft">Behandlingsnotat: {report.treatmentNote}</p>
            ) : null}
            {report.status === "OPEN" ? (
              <form action={adminReviewReportAction} className="mt-3 grid gap-2">
                <input type="hidden" name="reportId" value={report.id} />
                <label className="grid gap-1" htmlFor={`note-${report.id}`}>
                  <span className="label">Behandlingsnotat</span>
                  <textarea
                    className="field min-h-16"
                    id={`note-${report.id}`}
                    name="treatmentNote"
                    placeholder="Kort notat til revisjonsloggen"
                  />
                </label>
                <div className="flex gap-2">
                  <button className="btn btn-primary px-3 py-1 text-xs" name="status" value="REVIEWED">
                    Marker behandlet
                  </button>
                  <button className="btn btn-secondary px-3 py-1 text-xs" name="status" value="DISMISSED">
                    Avvis
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
