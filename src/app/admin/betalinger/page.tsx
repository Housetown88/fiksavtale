import { db } from "@/lib/db";
import { formatNok } from "@/lib/money";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function AdminPaymentsPage() {
  const payments = await db.payment.findMany({
    include: { booking: { include: { job: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Betalinger">
        DEMO-hendelser. Hendelses-ID (eventId) er nøkkelen som hindrer at samme bekreftelse telles to
        ganger. Dette er teknisk detalj for admin, ikke kundetekst.
      </PageTitle>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div key={payment.id} className="card p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{payment.booking.job.title}</p>
              <StatusBadge status={payment.status} showRaw />
            </div>
            <p>
              {formatNok(payment.amountOre)} · hendelses-ID {payment.eventId}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
