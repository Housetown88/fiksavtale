import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBookingForViewer } from "@/lib/authz";
import { getContactPayload } from "@/lib/contact";
import { simulateWebhookAction, startDemoPaymentAction } from "@/app/actions";
import { Alert, PageTitle, StatusBadge } from "@/components/ui";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { demoIntentBadgeStatus, paymentConfirmView } from "@/lib/payment-status-ui";
import { describeBookingMoney, isTerminalBookingStatus } from "@/lib/booking-totals";
import { formatNok } from "@/lib/money";

export default async function PaymentConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string; extra?: string; varsel?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  const { intent, extra, varsel } = await searchParams;
  let booking;
  try {
    booking = await getBookingForViewer(db, user, id);
  } catch {
    notFound();
  }
  const contact = await getContactPayload(db, { viewerId: user.id, jobId: booking.jobId });
  const extras = await db.extraCharge.findMany({ where: { bookingId: booking.id } });
  const paymentIntent = intent
    ? await db.paymentIntent.findUnique({ where: { id: intent } })
    : null;
  const extraCharge = extra
    ? await db.extraCharge.findUnique({ where: { id: extra } })
    : paymentIntent?.extraChargeId
      ? await db.extraCharge.findUnique({ where: { id: paymentIntent.extraChargeId } })
      : null;
  const money = describeBookingMoney({
    agreedOre: booking.amountOre,
    extras,
    platformFeeBps: booking.platformFeeBps,
    status: booking.status,
    refundedOre: booking.refundedOre,
  });
  const view = paymentConfirmView({
    bookingStatus: booking.status,
    intentStatus: paymentIntent?.status ?? null,
    contactUnlocked: contact.unlocked,
    extraCharge: Boolean(extraCharge),
    extraChargeStatus: extraCharge?.status ?? null,
    extraChargeId: extraCharge?.id ?? paymentIntent?.extraChargeId ?? null,
    intentKind: paymentIntent?.kind ?? null,
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle kicker="DEMO-betaling" title={view.title}>
        {view.body}
      </PageTitle>
      {varsel ? <Alert tone="warn">{varsel}</Alert> : null}
      <div className="card space-y-3 p-5">
        <p>
          Bookingstatus: <StatusBadge status={booking.status} />
        </p>
        {paymentIntent ? (
          <p>
            DEMO-økt:{" "}
            <StatusBadge
              status={demoIntentBadgeStatus({
                intentStatus: paymentIntent.status,
                bookingStatus: booking.status,
                contactUnlocked: contact.unlocked,
                extraCharge: Boolean(extraCharge),
                extraChargeStatus: extraCharge?.status ?? null,
              })}
            />{" "}
            · {formatNok(paymentIntent.amountOre)}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Ingen betalingsøkt er valgt.</p>
        )}
        {extraCharge ? (
          <div className="space-y-1 text-sm">
            <p>
              Tillegg: {extraCharge.title} — <StatusBadge status={extraCharge.status} />
            </p>
            <p>
              Allerede finansiert: {formatNok(money.fundedOre)}
              {money.extrasPaidOre > 0
                ? ` (jobb ${formatNok(money.agreedOre)} + betalte tillegg ${formatNok(money.extrasPaidOre)})`
                : ` (hovedjobb)`}
            </p>
            <p>
              Dette tillegget: {formatNok(extraCharge.amountOre)}
              {extraCharge.status === "PAID" ? " — betalt" : " — ikke finansiert ennå"}
            </p>
            {money.remainingToPayOre > 0 ? (
              <p>Gjenstår å betale: {formatNok(money.remainingToPayOre)}</p>
            ) : (
              <p>Ingenting gjenstår å betale.</p>
            )}
          </div>
        ) : null}
        {view.tone === "ok" ? (
          <Alert tone="ok">
            {extraCharge
              ? "Tillegget er merket som betalt i DEMO."
              : contact.unlocked
                ? "Kontakt er nå tilgjengelig for partene."
                : "Betalingen er bekreftet."}
          </Alert>
        ) : (
          <Alert tone={view.tone === "warn" ? "warn" : "info"}>{view.body}</Alert>
        )}
        <p className="text-sm">{view.nextAction}</p>
        {view.showSimulate && intent && booking.status === "PENDING_PAYMENT" && !extraCharge ? (
          <div className="flex flex-wrap gap-2">
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="succeeded" />
              <PendingSubmitButton className="btn btn-primary" pendingLabel="Bekrefter…">
                Bekreft DEMO-betaling
              </PendingSubmitButton>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="failed" />
              <PendingSubmitButton className="btn btn-secondary" pendingLabel="Simulerer…">
                Simuler feilet
              </PendingSubmitButton>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="outcome" value="cancelled" />
              <PendingSubmitButton className="btn btn-secondary" pendingLabel="Simulerer…">
                Simuler avbrutt
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}
        {view.showSimulate && intent && extraCharge && extraCharge.status === "APPROVED" && !isTerminalBookingStatus(booking.status) ? (
          <div className="flex flex-wrap gap-2">
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="extraChargeId" value={extraCharge.id} />
              <input type="hidden" name="outcome" value="succeeded" />
              <PendingSubmitButton className="btn btn-primary" pendingLabel="Bekrefter…">
                Bekreft DEMO-betaling
              </PendingSubmitButton>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="extraChargeId" value={extraCharge.id} />
              <input type="hidden" name="outcome" value="failed" />
              <PendingSubmitButton className="btn btn-secondary" pendingLabel="Simulerer…">
                Simuler feilet
              </PendingSubmitButton>
            </form>
            <form action={simulateWebhookAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="intentId" value={intent} />
              <input type="hidden" name="extraChargeId" value={extraCharge.id} />
              <input type="hidden" name="outcome" value="cancelled" />
              <PendingSubmitButton className="btn btn-secondary" pendingLabel="Simulerer…">
                Simuler avbrutt
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}
        {view.showRetry && !isTerminalBookingStatus(booking.status) ? (
          <form action={startDemoPaymentAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            {extraCharge ? <input type="hidden" name="extraChargeId" value={extraCharge.id} /> : null}
            <PendingSubmitButton className="btn btn-copper" pendingLabel="Starter…">
              Prøv igjen (DEMO)
            </PendingSubmitButton>
          </form>
        ) : null}
        <p className="text-xs text-ink-soft">DEMO — ingen ekte Vipps-trekk.</p>
        <Link href={`/booking/${booking.id}`} className="btn btn-secondary">
          Til bookingen
        </Link>
      </div>
    </div>
  );
}
