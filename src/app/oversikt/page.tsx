import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { describeBookingMoney } from "@/lib/booking-totals";
import { formatNok } from "@/lib/money";
import { PageTitle, StatusBadge } from "@/components/ui";
import { PlannedVippsProviderCopy } from "@/components/PaymentCopy";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");

  const jobs = await db.job.findMany({
    where: user.role === "CUSTOMER" ? { customerId: user.id } : undefined,
    include: { booking: true, offers: true },
    orderBy: { createdAt: "desc" },
    take: user.role === "PROVIDER" ? 8 : 20,
  });
  const bookings = await db.booking.findMany({
    where:
      user.role === "ADMIN"
        ? undefined
        : user.role === "CUSTOMER"
          ? { customerId: user.id }
          : { providerId: user.id },
    include: { job: true, extras: true },
    orderBy: { createdAt: "desc" },
  });
  const offers = user.role === "PROVIDER"
    ? await db.offer.findMany({
        where: { providerId: user.id },
        include: { job: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const funded = bookings.filter((booking) => ["PAID", "IN_PROGRESS", "COMPLETED"].includes(booking.status));
  const agreed = funded.reduce((sum, booking) => {
    const money = describeBookingMoney({
      agreedOre: booking.amountOre,
      extras: booking.extras,
      platformFeeBps: booking.platformFeeBps,
      status: booking.status,
      refundedOre: booking.refundedOre,
    });
    return sum + money.fundedOre - money.refundedOre;
  }, 0);
  const fees = funded.reduce((sum, booking) => {
    const money = describeBookingMoney({
      agreedOre: booking.amountOre,
      extras: booking.extras,
      platformFeeBps: booking.platformFeeBps,
      status: booking.status,
      refundedOre: booking.refundedOre,
    });
    return sum + money.feeAfterRefundOre;
  }, 0);

  return (
    <div className="space-y-8">
      <PageTitle kicker="Oversikt" title={`Hei, ${user.name}`}>
        {user.role === "PROVIDER"
          ? "Her ser du tilbud, bookinger og forventet utbetaling."
          : "Dine oppdrag og bookinger."}
      </PageTitle>

      {user.role === "PROVIDER" ? (
        <>
          <div className="card space-y-2 p-5">
            <h2 className="font-serif text-xl">Oppgjør (planlagt)</h2>
            <div className="text-sm text-ink-soft">
              <PlannedVippsProviderCopy />
            </div>
            <p className="text-xs text-ink-soft">
              Tallene under er DEMO-beregninger etter bekreftet booking, ikke ekte Vipps-utbetaling.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="card p-4">
              <p className="text-sm text-ink-soft">Finansiert totalt (betalte jobber)</p>
              <p className="font-serif text-3xl">{formatNok(agreed)}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-ink-soft">Provisjon registrert automatisk</p>
              <p className="font-serif text-3xl">{formatNok(fees)}</p>
            </div>
          </div>
        </>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl">Bookinger</h2>
        <div className="mt-3 space-y-2">
          {bookings.map((booking) => {
            const money = describeBookingMoney({
              agreedOre: booking.amountOre,
              extras: booking.extras,
              platformFeeBps: booking.platformFeeBps,
              status: booking.status,
              refundedOre: booking.refundedOre,
            });
            return (
              <Link key={booking.id} href={`/booking/${booking.id}`} className="card card-link flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{booking.job.title}</p>
                  <p className="text-sm text-ink-soft">
                    {money.isHistorical ? "Historisk " : ""}
                    jobb {formatNok(money.agreedOre)}
                    {money.extrasPaidOre > 0 ? ` + tillegg ${formatNok(money.extrasPaidOre)}` : ""}
                    {money.extrasApprovedUnpaidOre > 0
                      ? ` · gjenstår ${formatNok(money.remainingToPayOre)}`
                      : ""}{" "}
                    · gebyr {formatNok(money.feeAfterRefundOre)}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </Link>
            );
          })}
          {bookings.length === 0 ? <p className="text-sm text-ink-soft">Ingen bookinger ennå.</p> : null}
        </div>
      </section>

      {user.role === "CUSTOMER" || user.role === "ADMIN" ? (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Oppdrag</h2>
            <Link href="/oppdrag/nytt" className="text-sm font-semibold text-moss">
              Nytt oppdrag
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {jobs
              .filter((job) => user.role === "ADMIN" || job.customerId === user.id)
              .map((job) => (
                <Link key={job.id} href={`/oppdrag/${job.id}`} className="card card-link flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-ink-soft">{job.offers.length} tilbud</p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      {user.role === "PROVIDER" ? (
        <section>
          <h2 className="font-serif text-2xl">Dine tilbud</h2>
          <div className="mt-3 space-y-2">
            {offers.map((offer) => (
              <Link key={offer.id} href={`/oppdrag/${offer.jobId}`} className="card card-link flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{offer.job.title}</p>
                  <p className="text-sm text-ink-soft">{formatNok(offer.amountOre)}</p>
                </div>
                <StatusBadge status={offer.status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
