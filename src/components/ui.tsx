import Link from "next/link";
import { formatBudgetRange } from "@/lib/budget";
import { jobTypeFullLabel } from "@/lib/categories";
import { formatRelativeNb, initialsFromName } from "@/lib/format";
import { formatNok } from "@/lib/money";
import { statusLabelNb } from "@/lib/status-labels";
import { offerStatusLabelNb } from "@/lib/offer-submit";
import { orgBadges } from "@/lib/org-badges";

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
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
      {children ? <div className="mt-2 max-w-2xl text-ink-soft">{children}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="font-serif text-2xl tracking-tight text-ink">{title}</h2>
      {href && linkLabel ? (
        <Link href={href} className="shrink-0 text-sm font-semibold text-moss hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-moss/10 text-pine",
  OFFER_ACCEPTED: "bg-sand text-pine",
  BOOKED: "bg-pine/10 text-pine",
  IN_PROGRESS: "bg-pine/10 text-pine",
  COMPLETED: "bg-ok/10 text-ok",
  CANCELLED: "bg-sand text-ink-soft",
  DISPUTED: "bg-danger/10 text-danger",
  PENDING_PAYMENT: "bg-copper/10 text-copper-deep",
  PAID: "bg-ok/10 text-ok",
  REFUNDED: "bg-sand text-ink-soft",
  PENDING: "bg-sand text-pine",
  ACCEPTED: "bg-ok/10 text-ok",
  REJECTED: "bg-danger/10 text-danger",
  FAILED: "bg-danger/10 text-danger",
  SUCCEEDED: "bg-ok/10 text-ok",
  OPEN_REPORT: "bg-copper/10 text-copper-deep",
  PROPOSED: "bg-sand text-pine",
  APPROVED: "bg-copper/10 text-copper-deep",
  REVIEWED: "bg-ok/10 text-ok",
  DISMISSED: "bg-sand text-ink-soft",
  WITHDRAWN: "bg-sand text-ink-soft",
  EXPIRED: "bg-sand text-ink-soft",
};

export function StatusBadge({
  status,
  showRaw,
  kind,
}: {
  status: string;
  showRaw?: boolean;
  kind?: "default" | "offer";
}) {
  const label = kind === "offer" ? offerStatusLabelNb(status) : statusLabelNb(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-sand text-pine"}`}
      title={showRaw ? `Teknisk status: ${status}` : undefined}
    >
      {label}
    </span>
  );
}

export type JobCardData = {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string | null;
  area: string;
  budgetMinOre: number | null;
  budgetMaxOre: number | null;
  status: string;
  createdAt?: Date;
  offerCount?: number;
};

export function JobCard({
  job,
  showDescription = false,
}: {
  job: JobCardData;
  showDescription?: boolean;
}) {
  const budget = formatBudgetRange(job.budgetMinOre, job.budgetMaxOre, formatNok);

  return (
    <Link href={`/oppdrag/${job.id}`} className="card card-link flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-moss">{jobTypeFullLabel(job.category, job.subcategory)}</p>
        <StatusBadge status={job.status} />
      </div>
      <h2 className="mt-2 font-serif text-xl leading-snug tracking-tight">{job.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{job.area}</p>
      {showDescription && job.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{job.description}</p>
      ) : null}
      <p className="mt-3 text-sm font-semibold text-ink">{budget}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-ink-soft">
        <span>
          {job.createdAt ? formatRelativeNb(job.createdAt) : null}
          {job.offerCount != null
            ? `${job.createdAt ? " · " : ""}${job.offerCount} ${job.offerCount === 1 ? "tilbud" : "tilbud"}`
            : null}
        </span>
        <span className="font-semibold text-moss">Se jobb</span>
      </div>
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
    warn: "bg-copper/10 text-copper-deep",
    ok: "bg-moss/10 text-pine",
  }[tone];
  return <div className={`rounded-[var(--radius-lg)] px-4 py-3 text-sm ${colors}`}>{children}</div>;
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
          <dt>Opprinnelig jobbpris</dt>
          <dd>{formatNok(amountOre)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Plattformgebyr (trekkes automatisk)</dt>
          <dd>{formatNok(feeOre)}</dd>
        </div>
        {audience === "customer" ? (
          <div className="flex justify-between font-semibold">
            <dt>Du betaler</dt>
            <dd>{formatNok(amountOre)}</dd>
          </div>
        ) : (
          <div className="flex justify-between font-semibold">
            <dt>Forventet oppgjør til firma</dt>
            <dd>{formatNok(payoutOre)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs text-ink-soft">
        {audience === "customer"
          ? "Du betaler jobbprisen. Plattformgebyret trekkes automatisk i betalingsløpet. DEMO: ingen ekte trekk."
          : "Gebyret registreres automatisk når kunden finansierer jobben. Kortgebyr og MVA er ikke beregnet."}
      </p>
    </div>
  );
}

export function PriceBreakdown({
  view,
  audience,
}: {
  view: import("@/lib/booking-totals").BookingMoneyView;
  audience: "customer" | "provider" | "admin";
}) {
  return (
    <div className="card p-4 text-sm">
      <p className="font-semibold">{view.isHistorical ? "Prishistorikk (DEMO)" : "Prisoppsett (DEMO)"}</p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between">
          <dt>{view.originalJobLabel}</dt>
          <dd>{formatNok(view.agreedOre)}</dd>
        </div>
        {view.extrasPaidOre > 0 ? (
          <div className="flex justify-between">
            <dt>Betalte tillegg</dt>
            <dd>{formatNok(view.extrasPaidOre)}</dd>
          </div>
        ) : null}
        {view.extrasApprovedUnpaidOre > 0 ? (
          <div className="flex justify-between">
            <dt>{view.isClosed ? "Godkjent, ubetalt (historikk)" : "Godkjent, ikke betalt"}</dt>
            <dd>{formatNok(view.extrasApprovedUnpaidOre)}</dd>
          </div>
        ) : null}
        {view.financedOre !== view.agreedOre + view.extrasPaidOre || view.status === "PENDING_PAYMENT" || view.isCancelled ? (
          <div className="flex justify-between">
            <dt>Faktisk finansiert</dt>
            <dd>{formatNok(view.financedOre)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Plattformgebyr (automatisk)</dt>
          <dd>{formatNok(view.feeAfterRefundOre)}</dd>
        </div>
        {audience === "customer" ? (
          <div className="flex justify-between font-semibold">
            <dt>{view.customerPayLabel}</dt>
            <dd>{formatNok(view.agreedOre + view.extrasPaidOre)}</dd>
          </div>
        ) : (
          <div className="flex justify-between font-semibold">
            <dt>{view.providerPayoutLabel}</dt>
            <dd>{formatNok(view.settlementAfterRefundOre)}</dd>
          </div>
        )}
        {!view.isHistorical && !view.isDisputed && !view.isClosed ? (
          <div className="flex justify-between">
            <dt>Gjenstår å betale</dt>
            <dd>{formatNok(view.remainingToPayOre)}</dd>
          </div>
        ) : null}
        {view.refund.status === "applied" || view.refundedOre > 0 ? (
          <div className="flex justify-between">
            <dt>DEMO-refusjon (registrert)</dt>
            <dd>{formatNok(view.refundedOre)}</dd>
          </div>
        ) : null}
        {view.isDisputed && view.refund.heldOre > 0 ? (
          <div className="flex justify-between">
            <dt>Holdes i tvist (DEMO)</dt>
            <dd>{formatNok(view.refund.heldOre)}</dd>
          </div>
        ) : null}
        {view.refund.status !== "not_applicable" || view.isCancelled || view.isDisputed ? (
          <div className="flex justify-between">
            <dt>DEMO-refusjon status</dt>
            <dd>{view.refund.statusLabel}</dd>
          </div>
        ) : null}
      </dl>
      {view.refundLabel ? <p className="mt-2 text-xs text-ink-soft">{view.refundLabel}</p> : null}
      {view.inconsistentUnpaidApproved ? (
        <p className="mt-2 text-xs font-semibold text-danger">
          Avvik: jobben ble merket fullført mens godkjente tillegg sto ubetalt (
          {formatNok(view.extrasApprovedUnpaidOre)}). Dette er historikk, ikke et betalingskrav.
        </p>
      ) : view.isClosed && view.unpaidApprovedCount > 0 ? (
        <p className="mt-2 text-xs text-ink-soft">
          Godkjente ubetalte tillegg vises som historikk. De kan ikke betales på en avsluttet booking.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-ink-soft">
        Provisjon registreres automatisk ved finansiering. DEMO: ingen ekte Vipps-trekk.
      </p>
    </div>
  );
}

export function VerifiedBadge({ checked }: { checked: boolean }) {
  if (!checked) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold text-pine"
      title="Gyldig 9-sifret format og kontrollsiffer. Ikke det samme som Enhetsregister-oppslag."
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M8 1.3 9.7 2l1.9.4.4 1.9L13.7 6l-.4 1.9-.4 1.9-1.9.4L8 14.7 6.3 14l-1.9-.4-.4-1.9L2.3 10l.4-1.9.4-1.9 1.9-.4L8 1.3Zm-.2 8.7 3.2-3.3-.9-.9-2.3 2.3-1.1-1.1-.9.9 2 2.1Z"
        />
      </svg>
      Org.nr format OK
    </span>
  );
}

export function OrgBadgeList({
  profile,
}: {
  profile: {
    orgVerified: boolean;
    orgRegisterStatus?: string | null;
    orgRegisterName?: string | null;
    orgRepConfirmed?: boolean | null;
    tradeAuthChecked?: boolean | null;
  };
}) {
  const badges = orgBadges(profile);
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            badge.tone === "ok"
              ? "bg-moss/10 text-pine"
              : badge.tone === "warn"
                ? "bg-copper/10 text-copper-deep"
                : "bg-sand text-ink-soft"
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export function StarRating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-copper" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < filled ? "text-copper" : "text-line"}>
            ★
          </span>
        ))}
      </span>
      <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
      {count != null ? <span className="text-ink-soft">({count})</span> : null}
      <span className="sr-only">
        {rating.toFixed(1)} av 5{count != null ? ` fra ${count} vurderinger` : ""}
      </span>
    </span>
  );
}

export function InitialsAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-16 w-16 text-lg" }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-pine font-semibold text-paper ${sizeClass}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  );
}
