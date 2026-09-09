import { db } from "@/lib/db";
import { describeBookingMoney } from "@/lib/booking-totals";
import { formatNok } from "@/lib/money";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function AdminPaymentsPage() {
  const payments = await db.payment.findMany({
    include: { booking: { include: { job: true, extras: true } } },
    orderBy: { createdAt: "desc" },
  });
  const ledger = await db.settlementEntry.findMany({
    include: { booking: { include: { job: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return (
    <div className="space-y-8">
      <PageTitle title="Betalinger">
        DEMO-hendelser og automatisk provisjon i oppgjørsboken. Hendelses-ID hindrer dobbel
        avregning.
      </PageTitle>
      <div className="space-y-2">
        {payments.map((payment) => {
          const money = describeBookingMoney({
            agreedOre: payment.booking.amountOre,
            extras: payment.booking.extras,
            platformFeeBps: payment.booking.platformFeeBps,
            status: payment.booking.status,
            refundedOre: payment.booking.refundedOre,
          });
          return (
            <div key={payment.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{payment.booking.job.title}</p>
                <StatusBadge status={payment.status} showRaw />
              </div>
              <p>
                Hendelse {formatNok(payment.amountOre)} · samlet finansiert {formatNok(money.fundedOre)} ·
                gebyr {formatNok(money.feeAfterRefundOre)}
                {money.refund.status === "applied"
                  ? ` · DEMO-refusjon ${formatNok(money.refund.amountOre)} (${money.refund.statusLabel})`
                  : money.refund.status === "pending"
                    ? ` · DEMO-refusjon ${money.refund.statusLabel}`
                    : ""}
              </p>
            </div>
          );
        })}
      </div>
      <section>
        <h2 className="font-serif text-2xl">Oppgjørsbok</h2>
        <div className="mt-3 space-y-2">
          {ledger.map((entry) => (
            <div key={entry.id} className="card p-3 text-sm">
              <p className="font-semibold">
                {entry.booking.job.title} · {entry.type}
              </p>
              <p>
                {formatNok(entry.amountOre)}
                {entry.note ? ` · ${entry.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
