import { db } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export default async function AdminContactPage() {
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <PageTitle title="Kontaktmeldinger">
        Enkle meldinger fra /kontakt. Dette er ikke et ticketsystem.
      </PageTitle>
      <div className="space-y-2">
        {messages.map((item) => (
          <div key={item.id} className="card p-4 text-sm">
            <p className="font-semibold">
              {item.name} · {item.email}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{item.message}</p>
            <p className="mt-2 text-xs text-ink-soft">{item.createdAt.toLocaleString("nb-NO")}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-sm text-ink-soft">Ingen meldinger ennå.</p> : null}
      </div>
    </div>
  );
}
