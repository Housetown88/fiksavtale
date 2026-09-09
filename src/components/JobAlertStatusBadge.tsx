import type { JobAlertUiStatus } from "@/lib/job-alerts";

const TONE: Record<JobAlertUiStatus, string> = {
  AKTIVERT: "bg-ok/10 text-ok",
  PAUSET: "bg-copper/10 text-copper-deep",
  AV: "bg-sand text-ink-soft",
};

export function JobAlertStatusBadge({ status }: { status: JobAlertUiStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status]}`}>
      Jobbvarsler: {status}
    </span>
  );
}
