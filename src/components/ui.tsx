import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { formatNok } from "@/lib/money";

export function PageTitle({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {kicker ? <p className="text-sm font-semibold uppercase tracking-wider text-moss">{kicker}</p> : null}
      <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
      {children ? <div className="mt-2 max-w-2xl text-ink-soft">{children}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "Åpent",
    OFFER_ACCEPTED: "Tilbud valgt",
    BOOKED: "Booket",
    IN_PROGRESS: "Pågår",
    COMPLETED: "Fullført",
    CANCELLED: "Avbrutt",
    DISPUTED: "Tvist",
    PENDING_PAYMENT: "Venter betaling",
    PAID: "Betalt",
    REFUNDED: "Refundert",
    PENDING: "Venter",
    ACCEPTED: "Godtatt",
    REJECTED: "Avslått",
    FAILED: "Feilet",
    SUCCEEDED: "Bekreftet",
    OPEN_REPORT: "Åpen",
  };
  return (
    <span className="inline-flex rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-pine">
      {map[status] ?? status}
    </span>
  );
}

export function JobCard({
  job,
}: {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    area: string;
    budgetMinOre: number | null;
    budgetMaxOre: number | null;
    status: string;
  };
}) {
  return (
    <Link href={`/oppdrag/${job.id}`} className="card block p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-moss">{categoryLabel(job.category)} · {job.area}</p>
        <StatusBadge status={job.status} />
      </div>
      <h2 className="mt-2 font-serif text-xl">{job.title}</h2>
      <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{job.description}</p>
      <p className="mt-4 text-sm font-semibold">
        {job.budgetMinOre && job.budgetMaxOre
          ? `${formatNok(job.budgetMinOre)} – ${formatNok(job.budgetMaxOre)}`
          : "Budsjett etter avtale"}
      </p>
    </Link>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "ok";
  children: React.ReactNode;
}) {
  const colors = {
    info: "bg-sand/70 text-ink",
    warn: "bg-copper/10 text-copper",
    ok: "bg-moss/10 text-pine",
  }[tone];
  return <div className={`rounded-2xl px-4 py-3 text-sm ${colors}`}>{children}</div>;
}

export function FeeBox({
  amountOre,
  feeOre,
  payoutOre,
  audience,
}: {
  amountOre: number;
  feeOre: number;
  payoutOre: number;
  audience: "customer" | "provider";
}) {
  return (
    <div className="card p-4 text-sm">
      <p className="font-semibold">Prisoppsett (DEMO)</p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between">
          <dt>Jobbpris</dt>
          <dd>{formatNok(amountOre)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Plattformgebyr</dt>
          <dd>{formatNok(feeOre)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>{audience === "customer" ? "Du betaler" : "Forventet utbetaling"}</dt>
          <dd>{formatNok(audience === "customer" ? amountOre : payoutOre)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-soft">
        Gebyret tas bare av betalte jobber. Kortgebyr og MVA er ikke beregnet i prototypen.
      </p>
    </div>
  );
}

export function VerifiedBadge({ checked }: { checked: boolean }) {
  if (!checked) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold text-pine">
      Org.nr sjekket
    </span>
  );
}
