import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getConversationForViewer } from "@/lib/authz";
import { ChatForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  let conversation;
  try {
    conversation = await getConversationForViewer(db, user, id);
  } catch {
    notFound();
  }
  const messages = await db.message.findMany({
    where: { conversationId: id },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });
  const job = await db.job.findUniqueOrThrow({ where: { id: conversation.jobId } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={job.title} kicker="Samtale">
        <Link href={`/oppdrag/${job.id}`} className="text-sm font-semibold text-moss">
          Tilbake til oppdraget
        </Link>
      </PageTitle>
      <div className="card space-y-3 p-4 sm:p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm ${
              message.senderId === user.id ? "ml-auto bg-pine text-paper" : "bg-sand"
            }`}
          >
            <p className="text-xs opacity-80">{message.sender.name}</p>
            <p className="mt-0.5 whitespace-pre-wrap">{message.body}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-sm text-ink-soft">Ingen meldinger ennå.</p> : null}
      </div>
      <div className="card mt-4 p-4 sm:p-5">
        <ChatForm conversationId={id} />
      </div>
    </div>
  );
}
