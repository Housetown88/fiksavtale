import { db } from "@/lib/db";
import { formatNok } from "@/lib/money";
import { PageTitle } from "@/components/ui";

export default async function AdminHomePage() {
  const [users, jobs, payments, reports] = await Promise.all([
    db.user.count(),
    db.job.count(),
    db.payment.findMany({ where: { status: "SUCCEEDED" } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);
  const volume = payments.reduce((sum, payment) => sum + payment.amountOre, 0);
  return (
    <div>
      <PageTitle kicker="Admin" title="Kontrollpanel">
        Rollebeskyttet. Sensitive endringer logges.
      </PageTitle>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Brukere", String(users)],
          ["Oppdrag", String(jobs)],
          ["Betalt volum", formatNok(volume)],
          ["Åpne rapporter", String(reports)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="font-serif text-2xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
