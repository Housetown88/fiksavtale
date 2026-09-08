import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getJobForViewer } from "@/lib/authz";
import { canViewerSeeContact, getContactPayload } from "@/lib/contact";
import { categoryLabel } from "@/lib/categories";
import { calcCommission } from "@/lib/money";
import { getPlatformFeeBps } from "@/lib/settings";
import { acceptOfferAction } from "@/app/actions";
import { Alert, OrgBadgeList, PageTitle, StarRating, StatusBadge } from "@/components/ui";
import { OfferForm, ReportForm } from "@/components/forms";
import { JobImageGallery } from "@/components/JobImages";
import { formatBudgetRange } from "@/lib/budget";
import { formatNok } from "@/lib/money";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  let job;
  try {
    job = await getJobForViewer(db, user, id);
  } catch {
    notFound();
  }

  const isOwner = user?.id === job.customerId;
  const feeBps = await getPlatformFeeBps(db);
  const quoteAmount = job.budgetMaxOre ?? job.budgetMinOre ?? 500_000;
  const offers = await db.offer.findMany({
    where: {
      jobId: job.id,
      ...(isOwner || user?.role === "ADMIN" ? {} : user ? { providerId: user.id } : { id: "__none__" }),
    },
    include: {
      provider: { include: { providerProfile: true, reviewsReceived: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const contactUnlocked = user ? await canViewerSeeContact(db, { viewerId: user.id, jobId: job.id }) : false;
  const contact = user && contactUnlocked ? await getContactPayload(db, { viewerId: user.id, jobId: job.id }) : null;
  const conversation = user
    ? await db.conversation.findFirst({
        where: { jobId: job.id, OR: [{ customerId: user.id }, { providerId: user.id }] },
      })
    : null;
  // Bilder følger oppdragstilgang (getJobForViewer), ikke kontaktlås.
  // Utførere som kan se/by på åpne oppdrag, og booket utfører, skal se bildene.
  const images = await db.jobImage.findMany({
    where: { jobId: job.id },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <PageTitle kicker={`${categoryLabel(job.category)} · ${job.area}`} title={job.title}>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-sm">Kunde: {job.customer.name}</span>
          </div>
        </PageTitle>
        <div className="card p-5">
          <p className="whitespace-pre-wrap">{job.description}</p>
          <p className="mt-4 text-sm text-ink-soft">
            Synlig område: {job.area}
            {job.postalCode ? `, ${job.postalCode}` : ""}. Eksakt adresse vises etter bekreftet betaling.
          </p>
          {job.budgetMinOre != null || job.budgetMaxOre != null ? (
            <p className="mt-2 font-semibold">
              Budsjett: {formatBudgetRange(job.budgetMinOre, job.budgetMaxOre, formatNok)}
            </p>
          ) : null}
          {isOwner && job.status === "OPEN" ? (
            <p className="mt-3">
              <Link href={`/oppdrag/${job.id}/rediger`} className="text-sm font-semibold text-moss hover:underline">
                Rediger oppdrag
              </Link>
            </p>
          ) : null}
        </div>
        <JobImageGallery jobId={job.id} images={images} />

        {contact && contact.unlocked ? (
          <div className="card mt-4 p-5">
            <h2 className="font-serif text-xl tracking-tight">Kontakt (låst opp etter betaling)</h2>
            <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold">Kunde</p>
                <p>{contact.customer.name}</p>
                <p>{contact.customer.email}</p>
                <p>{contact.customer.phone}</p>
                <p>{contact.customer.addressLine}</p>
              </div>
              <div>
                <p className="font-semibold">Bedrift</p>
                <p>{contact.provider.companyName}</p>
                <p>{contact.provider.email}</p>
                <p>{contact.provider.phone}</p>
              </div>
            </div>
          </div>
        ) : (
          <Alert tone="info">
            Telefon, e-post og gateadresse vises først når bookingen er betalt.
          </Alert>
        )}

        {conversation ? (
          <p className="mt-4">
            <Link className="btn btn-secondary" href={`/samtaler/${conversation.id}`}>
              Åpne samtalen
            </Link>
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="font-serif text-2xl">Tilbud</h2>
          <div className="mt-3 space-y-3">
            {offers.map((offer) => {
              const reviewCount = offer.provider.reviewsReceived.length;
              const rating =
                reviewCount > 0
                  ? offer.provider.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) /
                    reviewCount
                  : null;
              return (
                <div key={offer.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/firma/${offer.provider.id}`} className="font-semibold">
                        {offer.provider.providerProfile?.companyName ?? offer.provider.name}
                      </Link>{" "}
                      {offer.provider.providerProfile ? (
                        <span className="mt-1 block">
                          <OrgBadgeList profile={offer.provider.providerProfile} />
                        </span>
                      ) : null}
                      {rating != null ? (
                        <span className="mt-1 block">
                          <StarRating rating={rating} count={reviewCount} />
                        </span>
                      ) : null}
                    </div>
                    <span className="font-serif text-xl">{formatNok(offer.amountOre)}</span>
                  </div>
                  <p className="mt-2 text-sm">{offer.message}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    Status: <StatusBadge status={offer.status} />. Gebyr{" "}
                    {formatNok(calcCommission(offer.amountOre, feeBps).platformFeeOre)} trekkes automatisk
                    ved finansiering.
                    {job.status === "CANCELLED" && offer.status === "ACCEPTED"
                      ? " Tilbudet ble godtatt før bookingen ble avbestilt — det er historikk, ikke en aktiv avtale."
                      : null}
                  </p>
                  {isOwner && offer.status === "PENDING" && job.status === "OPEN" ? (
                    <form action={acceptOfferAction} className="mt-3 space-y-2">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button className="btn btn-copper" type="submit">
                        Velg tilbud
                      </button>
                      <p className="text-xs text-ink-soft">
                        Planlagt: Vipps-reservasjon på {formatNok(offer.amountOre)}. I preview: ingen ekte
                        trekk.
                      </p>
                    </form>
                  ) : null}
                </div>
              );
            })}
            {offers.length === 0 ? <p className="text-sm text-ink-soft">Ingen synlige tilbud ennå.</p> : null}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        {user?.role === "PROVIDER" && job.status === "OPEN" ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl tracking-tight">Gi tilbud</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Kunden ser totalen. Dere ser gebyr og forventet oppgjør mens dere skriver prisen.
            </p>
            <div className="mt-3">
              <OfferForm jobId={job.id} feeBps={feeBps} defaultAmountOre={quoteAmount} />
            </div>
          </div>
        ) : null}
        {!user ? (
          <Alert>
            <Link href="/logg-inn" className="font-semibold">Logg inn</Link> for å gi tilbud eller starte samtale.
          </Alert>
        ) : null}
        {user ? (
          <div className="card p-5">
            <h2 className="font-serif text-xl">Meld fra</h2>
            <ReportForm targetJobId={job.id} targetUserId={job.customerId} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
