import Link from "next/link";
import { db } from "@/lib/db";
import { describeBookingMoney } from "@/lib/booking-totals";
import { formatNok } from "@/lib/money";
import { PageTitle, StatusBadge } from "@/components/ui";

export default async function AdminBookingsPage() {
  const bookings = await db.booking.findMany({
    include: {
      job: true,
      extras: true,
      customer: true,
      provider: { include: { providerProfile: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  const disputed = bookings.filter((booking) => booking.status === "DISPUTED");
  const inconsistent = bookings.filter((booking) =>
    describeBookingMoney({
      agreedOre: booking.amountOre,
      extras: booking.extras,
      platformFeeBps: booking.platformFeeBps,
      status: booking.status,
      refundedOre: booking.refundedOre,
    }).inconsistentUnpaidApproved,
  );

  return (
    <div className="space-y-8">
      <PageTitle title="Bookinger">
        Tvister, DEMO-refusjon og avvik. Krever ekte ADMIN-rolle — demo-kunde/firma har ikke tilgang.
      </PageTitle>

      <section>
        <h2 className="font-serif text-2xl">Tvister ({disputed.length})</h2>
        <div className="mt-3 space-y-2">
          {disputed.map((booking) => (
            <AdminBookingRow key={booking.id} booking={booking} />
          ))}
          {disputed.length === 0 ? <p className="text-sm text-ink-soft">Ingen tvister.</p> : null}
        </div>
      </section>

      {inconsistent.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl">Avvik: avsluttet med ubetalte tillegg</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Historiske rader der fullføring skjedde mens et godkjent tillegg sto ubetalt. Dette er ikke
            det samme som avbestilling eller tvist med ubetalt tillegg. Nye fullføringer blokkeres.
          </p>
          <div className="mt-3 space-y-2">
            {inconsistent.map((booking) => (
              <AdminBookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl">Alle bookinger</h2>
        <div className="mt-3 space-y-2">
          {bookings.map((booking) => (
            <AdminBookingRow key={booking.id} booking={booking} />
          ))}
          {bookings.length === 0 ? <p className="text-sm text-ink-soft">Ingen bookinger.</p> : null}
        </div>
      </section>
    </div>
  );
}

function AdminBookingRow({
  booking,
}: {
  booking: {
    id: string;
    status: string;
    amountOre: number;
    platformFeeBps: number;
    refundedOre: number;
    extras: { amountOre: number; status: string }[];
    job: { title: string };
    customer: { name: string };
    provider: { name: string; providerProfile: { companyName: string } | null };
  };
}) {
  const money = describeBookingMoney({
    agreedOre: booking.amountOre,
    extras: booking.extras,
    platformFeeBps: booking.platformFeeBps,
    status: booking.status,
    refundedOre: booking.refundedOre,
  });
  const company = booking.provider.providerProfile?.companyName ?? booking.provider.name;
  return (
    <Link href={`/booking/${booking.id}`} className="card card-link block p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{booking.job.title}</p>
        <StatusBadge status={booking.status} showRaw />
      </div>
      <p className="mt-1 text-ink-soft">
        {booking.customer.name} · {company} · avtalt {formatNok(money.agreedOre)} · finansiert{" "}
        {formatNok(money.financedOre)}
        {money.remainingToPayOre > 0 ? ` · rest ${formatNok(money.remainingToPayOre)}` : ""}
        {money.refund.status === "applied"
          ? ` · DEMO-refusjon ${formatNok(money.refund.amountOre)} (${money.refund.statusLabel})`
          : money.refund.status === "pending"
            ? ` · DEMO-refusjon ${money.refund.statusLabel} · holdes ${formatNok(money.refund.heldOre)}`
            : money.isCancelled || money.isRefunded
              ? ` · DEMO-refusjon ${money.refund.statusLabel}`
              : ""}
        {money.inconsistentUnpaidApproved
          ? ` · avvik ubetalt tillegg ${formatNok(money.extrasApprovedUnpaidOre)}`
          : money.isClosed && money.unpaidApprovedCount > 0
            ? ` · ubetalt tillegg ${formatNok(money.extrasApprovedUnpaidOre)} (historikk)`
            : ""}
      </p>
    </Link>
  );
}
