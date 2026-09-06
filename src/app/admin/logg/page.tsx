import { db } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export default async function AdminAuditPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <div>
      <PageTitle title="Revisjonslogg" />
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="card p-4 text-sm">
            <p className="font-semibold">{log.action}</p>
            <p>
              {log.actor.name} · {log.targetType} {log.targetId}
            </p>
            <p className="text-ink-soft">{log.details}</p>
            <p className="text-xs">{log.createdAt.toLocaleString("nb-NO")}</p>
          </div>
        ))}
        {logs.length === 0 ? <p>Ingen administrative hendelser ennå.</p> : null}
      </div>
    </div>
  );
}
