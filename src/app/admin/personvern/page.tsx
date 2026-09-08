import { db } from "@/lib/db";
import { PageTitle, StatusBadge } from "@/components/ui";
import { adminResolveDataRequestAction } from "@/app/actions";

export default async function AdminPrivacyPage() {
  const requests = await db.dataRequest.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Personvernkø">
        Innsyn, eksport og sletting. Sletting anonymiserer, men beholder beløp og oppgjørsbok.
      </PageTitle>
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="card space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {request.user.name} · {request.user.email} · {request.type}
              </p>
              <StatusBadge status={request.status} />
            </div>
            {request.message ? <p>{request.message}</p> : null}
            {request.status === "OPEN" ? (
              <form action={adminResolveDataRequestAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input className="field max-w-xs" name="adminNote" placeholder="Notat til saken" />
                <button className="btn btn-primary px-3 py-1 text-xs" name="status" value="COMPLETED">
                  Fullfør
                </button>
                <button className="btn btn-secondary px-3 py-1 text-xs" name="status" value="REJECTED">
                  Avvis
                </button>
              </form>
            ) : (
              <p className="text-xs text-ink-soft">{request.adminNote}</p>
            )}
          </div>
        ))}
        {requests.length === 0 ? <p className="text-sm text-ink-soft">Ingen forespørsler.</p> : null}
      </div>
    </div>
  );
}
