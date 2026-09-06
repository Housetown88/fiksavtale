import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBookingForViewer } from "@/lib/authz";
import { getContactPayload } from "@/lib/contact";
import {
  completeBookingAction,
  decideExtraAction,
  startDemoPaymentAction,
  startWorkAction,
} from "@/app/actions";
import { Alert, FeeBox, PageTitle, StatusBadge } from "@/components/ui";
import { CancelForm, ExtraForm, ReviewForm } from "@/components/forms";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  let booking;
  try {
    booking = await getBookingForViewer(db, user, id);
  } catch {
    notFound();
  }
  const extras = await db.extraCharge.findMany({ where: { bookingId: booking.id } });
  const review = await db.review.findUnique({ where: { bookingId: booking.id } });
  const contact = await getContactPayload(db, { viewerId: user.id, jobId: booking.jobId });
  const job = await db.job.findUniqueOrThrow({ where: { id: booking.jobId } });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle kicker="Booking" title={job.title}>
          <StatusBadge status={booking.status} />
        </PageTitle>
        <FeeBox
          amountOre={booking.amountOre}
          feeOre={booking.platformFeeOre}
          payoutOre={booking.providerPayoutOre}
          audience={user.id === booking.providerId ? "provider" : "customer"}
        />
        <div className="mt-4 space-y-3">
          {booking.status === "PENDING_PAYMENT" && user.id === booking.customerId ? (
            <form action={startDemoPaymentAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="btn btn-copper" type="submit">
                Start DEMO-betaling
              </button>
            </form>
          ) : null}
          {booking.status === "PAID" && user.id === booking.providerId ? (
            <form action={startWorkAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="btn btn-primary" type="submit">
                Marker arbeid startet
              </button>
            </form>
          ) : null}
          {(booking.status === "IN_PROGRESS" || booking.status === "PAID") && user.id === booking.customerId ? (
            <form action={completeBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="btn btn-primary" type="submit">
                Godkjenn ferdig arbeid
              </button>
            </form>
          ) : null}
          <Link className="btn btn-secondary" href={`/oppdrag/${job.id}`}>
            Til oppdraget
          </Link>
        </div>
      </div>
      <div className="space-y-4">
        {contact.unlocked ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Kontakt er låst opp</h2>
            <p className="mt-2 text-sm">Når kontakt først er sett, kan den ikke «gjøres usett».</p>
            <p className="mt-2 text-sm">{contact.customer.name}: {contact.customer.phone} · {contact.customer.email}</p>
            <p className="text-sm">{contact.customer.addressLine}</p>
            <p className="mt-2 text-sm">{contact.provider.companyName}: {contact.provider.phone}</p>
          </div>
        ) : (
          <Alert tone="warn">{contact.reason}</Alert>
        )}
        <div className="card p-5">
          <h2 className="font-serif text-xl">Tillegg</h2>
          <p className="text-sm text-ink-soft">Ekstra arbeid skal godkjennes og betales i appen.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {extras.map((extra) => (
              <li key={extra.id} className="flex items-center justify-between gap-2">
                <span>{extra.title} — {extra.status}</span>
                {user.id === booking.customerId && extra.status === "PROPOSED" ? (
                  <form action={decideExtraAction} className="flex gap-1">
                    <input type="hidden" name="extraId" value={extra.id} />
                    <button className="btn btn-primary px-3 py-1 text-xs" name="decision" value="APPROVED">
                      Godkjenn
                    </button>
                    <button className="btn btn-secondary px-3 py-1 text-xs" name="decision" value="REJECTED">
                      Avslå
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
          {user.id === booking.providerId ? <div className="mt-3"><ExtraForm bookingId={booking.id} /></div> : null}
        </div>
        {booking.status === "COMPLETED" && user.id === booking.customerId && !review ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Anmeld bedriften</h2>
            <ReviewForm bookingId={booking.id} />
          </div>
        ) : null}
        {review ? (
          <Alert tone="ok">Anmeldelse: {review.rating}/5 — {review.comment}</Alert>
        ) : null}
        {booking.status !== "COMPLETED" && booking.status !== "REFUNDED" ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Avbestill</h2>
            <p className="mb-2 text-sm text-ink-soft">
              Se også <Link href="/avbestilling" className="underline">avbestillingsreglene</Link>.
            </p>
            <CancelForm bookingId={booking.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
