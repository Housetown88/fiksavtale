import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InitialsAvatar, StarRating, VerifiedBadge } from "@/components/ui";
import { ReportForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/session";
import { categoryLabel } from "@/lib/categories";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [provider, completed] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: { providerProfile: true, reviewsReceived: { include: { author: true } } },
    }),
    db.booking.findMany({
      where: { providerId: id, status: "COMPLETED" },
      include: { job: { select: { id: true, category: true, area: true } } },
      orderBy: { completedAt: "desc" },
    }),
  ]);
  if (!provider || !provider.providerProfile) notFound();
  const reviewCount = provider.reviewsReceived.length;
  const avg =
    reviewCount > 0
      ? provider.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : null;
  const fag = [...new Set(completed.map((item) => item.job.category))];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <InitialsAvatar name={provider.providerProfile.companyName} size="lg" />
          <div>
            <p className="kicker">Bedrift</p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
              {provider.providerProfile.companyName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerifiedBadge checked={provider.providerProfile.orgVerified} />
              <span className="text-sm text-ink-soft">Org.nr {provider.providerProfile.orgNumber}</span>
            </div>
          </div>
        </div>
        {provider.providerProfile.serviceAreas ? (
          <p className="mt-2 text-sm text-ink-soft">Områder: {provider.providerProfile.serviceAreas}</p>
        ) : null}
        {fag.length > 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            Fag fra fullførte jobber: {fag.map((slug) => categoryLabel(slug)).join(", ")}
          </p>
        ) : null}
        {provider.providerProfile.about ? (
          <p className="mt-4 whitespace-pre-wrap">{provider.providerProfile.about}</p>
        ) : null}
        <p className="mt-3 text-sm text-ink-soft">Kontakt og fakturae-post vises først etter betalt booking.</p>
        {avg != null ? (
          <p className="mt-3">
            <StarRating rating={avg} count={reviewCount} />
            <span className="ml-2 text-sm text-ink-soft">fra fullførte jobber</span>
          </p>
        ) : null}
      </div>

      {reviewCount > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl tracking-tight">Vurderinger</h2>
          {provider.reviewsReceived.map((review) => (
            <div key={review.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StarRating rating={review.rating} />
                <p className="text-sm font-semibold">{review.author.name}</p>
              </div>
              <p className="mt-2 text-sm">{review.comment}</p>
            </div>
          ))}
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl tracking-tight">Fullførte jobber</h2>
          {completed.map((booking) => (
            <div key={booking.id} className="card p-4">
              <p className="text-sm font-semibold text-moss">{categoryLabel(booking.job.category)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {booking.job.area}
                {booking.completedAt
                  ? ` · ${booking.completedAt.toLocaleDateString("nb-NO", { month: "long", year: "numeric" })}`
                  : null}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Offentlig referanse — tittel, adresse og chat er private.
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {user ? (
        <div className="card p-5">
          <h2 className="font-serif text-xl tracking-tight">Meld fra om brukeren</h2>
          <ReportForm targetUserId={provider.id} />
        </div>
      ) : null}
    </div>
  );
}
