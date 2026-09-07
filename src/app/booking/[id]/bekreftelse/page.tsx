import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBookingForViewer } from "@/lib/authz";
import { getContactPayload } from "@/lib/contact";
import { simulateWebhookAction } from "@/app/actions";
import { Alert, PageTitle, StatusBadge } from "@/components/ui";

export default async function PaymentConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  const { intent } = await searchParams;
  let booking;
  try {
    booking = await getBookingForViewer(db, user, id);
  } catch {
    notFound();
  }
  const contact = await getContactPayload(db, { viewerId: user.id, jobId: booking.jobId });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle kicker="DEMO-betaling" title="Betalingen er ikke ferdig ennå">
        Denne siden alene åpner ikke kontakt. Vipps er ikke live.
      </PageTitle>
      <div className="card space-y-3 p-5">
        <p className="text-sm text-ink-soft">
          I preview må DEMO-bekreftelsen under kjøres for at bookingen skal merkes som betalt.
          Planlagt med Vipps: reservasjon ved booking, trekk først når du godkjenner jobben (eller
          etter frist). Jobbenmin oppbevarer ikke oppdragspengene.
        </p>
        <p>
          Bookingstatus: <StatusBadge status={booking.status} />
        </p>
        <p className="text-sm">
          Betalingsintensjon: <code>{intent ?? "mangler"}</code>
        </p>
        {contact.unlocked ? (
          <Alert tone="ok">Webhook er mottatt. Kontakt er nå tilgjengelig for partene.</Alert>
        ) : (
          <Alert tone="warn">
            Kontakt er fortsatt låst. Bruk DEMO-knappene under for å simulere vellykket, feilet eller
            avbrutt betaling.
          </Alert>
        )}
        {intent && booking.status === "PENDING_PAYMENT" ? (
          <div className="flex flex-wrap gap-2">
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="succeeded" />
              <button className="btn btn-primary" type="submit">
                Send payment.succeeded
              </button>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="failed" />
              <button className="btn btn-secondary" type="submit">
                Send payment.failed
              </button>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="cancelled" />
              <button className="btn btn-secondary" type="submit">
                Send payment.cancelled
              </button>
            </form>
          </div>
        ) : null}
        <Link href={`/booking/${booking.id}`} className="btn btn-secondary">
          Til bookingen
        </Link>
      </div>
    </div>
  );
}
