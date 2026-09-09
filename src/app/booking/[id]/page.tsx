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
import { Alert, PageTitle, PriceBreakdown, StatusBadge } from "@/components/ui";
import { CancelForm, ExtraForm, ReviewForm } from "@/components/forms";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { CheckoutPaymentCopy, PlannedVippsProviderCopy } from "@/components/PaymentCopy";
import { describeBookingMoney, extraImpact } from "@/lib/booking-totals";
import { formatNok } from "@/lib/money";
import { statusLabelNb } from "@/lib/status-labels";
import { LEDGER } from "@/lib/ledger";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ varsel?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  const { varsel } = await searchParams;
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
  const disputeHold = moneyNeedsLedger(booking.status)
    ? await db.settlementEntry.findFirst({
        where: { bookingId: booking.id, type: LEDGER.DISPUTE_HOLD },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const isCustomer = user.id === booking.customerId;
  const isProvider = user.id === booking.providerId;
  const money = describeBookingMoney({
    agreedOre: booking.amountOre,
    extras,
    platformFeeBps: booking.platformFeeBps,
    status: booking.status,
    refundedOre: booking.refundedOre,
  });
  const showRefundCard =
    money.isCancelled || money.isRefunded || money.isDisputed || money.refundedOre > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <PageTitle kicker="Booking" title={job.title}>
          <StatusBadge status={booking.status} />
        </PageTitle>
        {varsel ? <Alert tone="warn">{varsel}</Alert> : null}
        {money.isCancelled ? (
          <Alert tone="warn">
            Bookingen er avbestilt. Tilbudet som ble valgt står fortsatt som godtatt i historikken — det er
            ikke en aktiv avtale. Summene under er historikk, ikke et betalingskrav.
          </Alert>
        ) : null}
        {money.isDisputed ? (
          <Alert tone="warn">
            Bookingen er i tvist etter avbestilling etter start. Oppgjør holdes. Kontakt forblir synlig
            fordi den allerede er delt. Ingen ekte Vipps-tilbakebetaling skjer i DEMO.
          </Alert>
        ) : null}
        {money.inconsistentUnpaidApproved ? (
          <Alert tone="warn">
            Avvik: jobben ble merket fullført mens godkjente tillegg på{" "}
            {formatNok(money.extrasApprovedUnpaidOre)} sto ubetalt. Dette er historikk, ikke et
            betalingskrav — bookingen er allerede avsluttet.
          </Alert>
        ) : money.isClosed && money.unpaidApprovedCount > 0 ? (
          <Alert tone="info">
            Bookingen er avsluttet. Godkjente ubetalte tillegg vises som historikk og kan ikke betales
            her.
          </Alert>
        ) : null}
        <div className="mt-3">
          <PriceBreakdown view={money} audience={isProvider ? "provider" : "customer"} />
        </div>
        {showRefundCard ? (
          <div className="card mt-3 space-y-2 p-4 text-sm">
            <h2 className="font-semibold">{money.refund.headline}</h2>
            <p>
              Beløp:{" "}
              <strong>
                {formatNok(money.refund.status === "pending" ? money.refund.heldOre : money.refund.amountOre)}
              </strong>
              {" · "}
              Status: <strong>{money.refund.statusLabel}</strong>
            </p>
            {money.refund.status === "pending" ? (
              <p>
                Holdes i oppgjørsboken
                {disputeHold ? ` (${formatNok(disputeHold.amountOre)})` : ""}. Ingen DEMO-refusjon er
                bokført ennå.
              </p>
            ) : null}
            <p>{money.refund.detail}</p>
            {booking.cancelReason ? <p>Grunn: {booking.cancelReason}</p> : null}
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          {booking.status === "PENDING_PAYMENT" && isCustomer ? (
            <div className="card space-y-3 p-5">
              <h2 className="font-serif text-xl">Bekreft booking</h2>
              <CheckoutPaymentCopy amountLabel={formatNok(booking.amountOre)} />
              <form action={startDemoPaymentAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <PendingSubmitButton className="btn btn-copper" pendingLabel="Starter…">
                  Bekreft og fortsett (DEMO — ingen ekte trekk)
                </PendingSubmitButton>
              </form>
            </div>
          ) : null}
          {isProvider && !money.isClosed ? (
            <div className="card space-y-2 p-5">
              <h2 className="font-serif text-xl">Oppgjør (planlagt)</h2>
              <div className="text-sm text-ink-soft">
                <PlannedVippsProviderCopy />
              </div>
              {booking.status === "PENDING_PAYMENT" ? (
                <p className="text-xs text-ink-soft">
                  I preview venter bookingen på DEMO-bekreftelse. Ingen ekte Vipps-reservasjon er lagt.
                </p>
              ) : null}
            </div>
          ) : null}
          {booking.status === "PAID" && isProvider ? (
            <form action={startWorkAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <PendingSubmitButton className="btn btn-primary" pendingLabel="Lagrer…">
                Marker arbeid startet
              </PendingSubmitButton>
            </form>
          ) : null}
          {(booking.status === "IN_PROGRESS" || booking.status === "PAID") && isCustomer ? (
            <div className="space-y-2">
              {money.unpaidApprovedCount > 0 ? (
                <Alert tone="warn">
                  Godkjente tillegg må betales før du kan godkjenne ferdig arbeid.
                </Alert>
              ) : (
                <form action={completeBookingAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <PendingSubmitButton className="btn btn-primary" pendingLabel="Godkjenner…">
                    Godkjenn ferdig arbeid
                  </PendingSubmitButton>
                </form>
              )}
              <p className="text-xs text-ink-soft">
                I DEMO er bookingen allerede merket betalt etter bekreftelse. Planlagt med Vipps: godkjenning
                (eller avtalt frist) utløser trekket.
              </p>
            </div>
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
          <p className="text-sm text-ink-soft">
            {money.isClosed
              ? "Tillegg vises som historikk. Ubetalte tillegg kan ikke betales på en avsluttet booking."
              : "Ekstra arbeid skal godkjennes og betales i appen før det teller som finansiert. Godkjenning alene endrer ikke jobbprisen."}
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {extras.map((extra) => {
              const impact = extraImpact({
                agreedOre: booking.amountOre,
                extras: extras.filter((item) => item.id !== extra.id),
                extraAmountOre: extra.amountOre,
                platformFeeBps: booking.platformFeeBps,
              });
              return (
                <li key={extra.id} className="rounded-[var(--radius)] border border-line/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{extra.title}</p>
                      <p>Pris: {formatNok(extra.amountOre)}</p>
                      <p className="text-xs text-ink-soft">
                        Gebyr på tillegget: {formatNok(impact.extraFeeOre)} (trekkes automatisk ved
                        betaling). Ny samlet totalt hvis finansiert: {formatNok(impact.combinedOre)}.
                      </p>
                    </div>
                    <StatusBadge status={extra.status} />
                  </div>
                  {isCustomer && extra.status === "PROPOSED" && !money.isClosed ? (
                    <form action={decideExtraAction} className="mt-3 space-y-2">
                      <input type="hidden" name="extraId" value={extra.id} />
                      <p className="text-xs text-ink-soft">
                        Godkjenning betyr at du aksepterer {formatNok(extra.amountOre)} i tillegg. Du må
                        deretter bekrefte DEMO-betaling før tillegget teller som betalt.
                      </p>
                      <div className="flex gap-1">
                        <PendingSubmitButton
                          className="btn btn-primary px-3 py-1 text-xs"
                          pendingLabel="Lagrer…"
                          name="decision"
                          value="APPROVED"
                        >
                          Godkjenn
                        </PendingSubmitButton>
                        <PendingSubmitButton
                          className="btn btn-secondary px-3 py-1 text-xs"
                          pendingLabel="Lagrer…"
                          name="decision"
                          value="REJECTED"
                        >
                          Avslå
                        </PendingSubmitButton>
                      </div>
                    </form>
                  ) : null}
                  {isCustomer && extra.status === "APPROVED" && !money.isClosed ? (
                    <form action={startDemoPaymentAction} className="mt-3">
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="extraChargeId" value={extra.id} />
                      <PendingSubmitButton className="btn btn-copper" pendingLabel="Starter…">
                        Betal tillegg (DEMO) — {formatNok(extra.amountOre)}
                      </PendingSubmitButton>
                    </form>
                  ) : null}
                  {extra.status === "APPROVED" ? (
                    <p className="mt-2 text-xs text-ink-soft">
                      Status: {statusLabelNb("APPROVED")}. Teller ikke som finansiert før betaling er
                      bekreftet.
                      {money.isClosed
                        ? " Bookingen er avsluttet, så tillegget kan ikke betales her."
                        : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {isProvider && !money.isClosed && ["PAID", "IN_PROGRESS"].includes(booking.status) ? (
            <div className="mt-3">
              <ExtraForm bookingId={booking.id} />
            </div>
          ) : null}
        </div>
        {booking.status === "COMPLETED" && isCustomer && !review ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Anmeld bedriften</h2>
            <ReviewForm bookingId={booking.id} />
          </div>
        ) : null}
        {review ? (
          <Alert tone="ok">Anmeldelse: {review.rating}/5 — {review.comment}</Alert>
        ) : null}
        {!money.isClosed ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Avbestill</h2>
            <p className="mb-2 text-sm text-ink-soft">
              Se også <Link href="/avbestilling" className="underline">avbestillingsreglene</Link>.
              Etter start settes bookingen i tvist og finansierte beløp holdes (DEMO-refusjon venter).
            </p>
            <CancelForm bookingId={booking.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function moneyNeedsLedger(status: string) {
  return status === "DISPUTED";
}
