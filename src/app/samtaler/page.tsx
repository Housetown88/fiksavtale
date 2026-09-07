import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function ConversationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const conversations = await db.conversation.findMany({
    where: { OR: [{ customerId: user.id }, { providerId: user.id }] },
    include: { job: true, customer: true, provider: { include: { providerProfile: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Samtaler" kicker="Intern chat">
        Kontaktinfo filtreres. Vedlegg er slått av i v1.
      </PageTitle>
      <div className="space-y-3">
        {conversations.map((item) => (
          <Link key={item.id} href={`/samtaler/${item.id}`} className="card card-link block p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{item.job.title}</p>
              <StatusBadge status={item.job.status} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {user.id === item.customerId
                ? item.provider.providerProfile?.companyName ?? item.provider.name
                : item.customer.name}
            </p>
          </Link>
        ))}
        {conversations.length === 0 ? <p>Ingen samtaler ennå.</p> : null}
      </div>
    </div>
  );
}
