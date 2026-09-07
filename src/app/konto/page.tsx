import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { InitialsAvatar, PageTitle, VerifiedBadge } from "@/components/ui";
import { ProfileForm } from "@/components/forms";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const full = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { customerProfile: true, providerProfile: true },
  });
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="Konto" kicker={full.role === "PROVIDER" ? "Bedrift" : "Kunde"}>
        Rediger profilen din. E-post kan ikke endres her.
      </PageTitle>
      <div className="card flex flex-wrap gap-3 p-4 text-sm">
        <Link href="/oversikt" className="btn btn-primary">
          {full.role === "CUSTOMER" ? "Mine jobber" : "Oversikt"}
        </Link>
        <Link href="/samtaler" className="btn btn-secondary">
          Samtaler
        </Link>
        <Link href="/kontakt" className="btn btn-secondary">
          Kontakt / hjelp
        </Link>
      </div>
      <div className="card p-5 text-sm sm:p-6">
        <div className="mb-3 flex items-center gap-3">
          <InitialsAvatar name={full.providerProfile?.companyName ?? full.name} />
          <p className="font-serif text-2xl tracking-tight">{full.name}</p>
        </div>
        <p className="mt-2">{full.email}</p>
        <p>Telefon lagres, men vises bare etter betalt booking.</p>
        {full.providerProfile ? (
          <div className="mt-3">
            <p className="font-semibold">{full.providerProfile.companyName}</p>
            <p>
              Org.nr {full.providerProfile.orgNumber} <VerifiedBadge checked={full.providerProfile.orgVerified} />
            </p>
          </div>
        ) : null}
      </div>
      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 font-serif text-xl">Rediger profil</h2>
        <ProfileForm user={full} />
      </div>
    </div>
  );
}
