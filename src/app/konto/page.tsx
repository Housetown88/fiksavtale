import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PageTitle, VerifiedBadge } from "@/components/ui";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const full = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { customerProfile: true, providerProfile: true },
  });
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Konto" kicker={full.role === "PROVIDER" ? "Bedrift" : "Kunde"} />
      <div className="card p-5 text-sm">
        <p className="font-serif text-2xl">{full.name}</p>
        <p className="mt-2">{full.email}</p>
        <p>Telefon lagret, men vises bare etter betalt booking.</p>
        {full.customerProfile ? (
          <p className="mt-2">
            Område: {full.customerProfile.area}. Gateadresse er skjult for andre til betaling er bekreftet.
          </p>
        ) : null}
        {full.providerProfile ? (
          <div className="mt-3">
            <p className="font-semibold">{full.providerProfile.companyName}</p>
            <p>Org.nr {full.providerProfile.orgNumber} <VerifiedBadge checked={full.providerProfile.orgVerified} /></p>
            <p className="mt-2 text-ink-soft">{full.providerProfile.about}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
