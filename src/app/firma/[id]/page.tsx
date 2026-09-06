import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle, VerifiedBadge } from "@/components/ui";
import { ReportForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/session";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const provider = await db.user.findUnique({
    where: { id },
    include: { providerProfile: true, reviewsReceived: { include: { author: true } } },
  });
  if (!provider || !provider.providerProfile) notFound();
  const avg =
    provider.reviewsReceived.length > 0
      ? provider.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) /
        provider.reviewsReceived.length
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title={provider.providerProfile.companyName} kicker="Bedrift">
        <VerifiedBadge checked={provider.providerProfile.orgVerified} />
        <span className="ml-2 text-sm">Org.nr {provider.providerProfile.orgNumber}</span>
      </PageTitle>
      <div className="card p-5">
        <p>{provider.providerProfile.about}</p>
        <p className="mt-2 text-sm text-ink-soft">Områder: {provider.providerProfile.serviceAreas}</p>
        <p className="mt-2 text-sm">Kontakt og fakturae-post vises først etter betalt booking.</p>
        {avg ? <p className="mt-3 font-semibold">{avg.toFixed(1)} / 5 fra fullførte jobber</p> : null}
      </div>
      <div className="space-y-3">
        {provider.reviewsReceived.map((review) => (
          <div key={review.id} className="card p-4">
            <p className="font-semibold">{review.rating}/5 · {review.author.name}</p>
            <p className="text-sm">{review.comment}</p>
          </div>
        ))}
      </div>
      {user ? (
        <div className="card p-5">
          <h2 className="font-serif text-xl">Meld fra om brukeren</h2>
          <ReportForm targetUserId={provider.id} />
        </div>
      ) : null}
    </div>
  );
}
