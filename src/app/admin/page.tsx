import Link from "next/link";
import { db } from "@/lib/db";
import { formatNok } from "@/lib/money";
import { PageTitle } from "@/components/ui";

export default async function AdminHomePage() {
  const [users, jobs, payments, reports, disputed, completedUnpaid] = await Promise.all([
    db.user.count(),
    db.job.count(),
    db.payment.findMany({ where: { status: "SUCCEEDED" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.booking.count({ where: { status: "DISPUTED" } }),
    db.booking.count({
      where: {
        status: "COMPLETED",
        extras: { some: { status: "APPROVED" } },
      },
    }),
  ]);
  const volume = payments.reduce((sum, payment) => sum + payment.amountOre, 0);
  return (
    <div>
      <PageTitle kicker="Admin" title="Kontrollpanel">
        Rollebeskyttet (`role = ADMIN`). Demo-kunde/firma sendes til vanlig oversikt. Demokontoen
        admin@demo.jobbenmin.no er av i produksjon.
      </PageTitle>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          ["Brukere", String(users), "/admin/brukere"],
          ["Oppdrag", String(jobs), "/admin/oppdrag"],
          ["Tvister", String(disputed), "/admin/bookinger"],
          ["Fullført med ubetalt tillegg", String(completedUnpaid), "/admin/bookinger"],
          ["Betalt volum", formatNok(volume), "/admin/betalinger"],
          ["Åpne rapporter", String(reports), "/admin/rapporter"],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="card card-link p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="font-serif text-2xl">{value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
