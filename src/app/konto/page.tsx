import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { InitialsAvatar, OrgBadgeList, PageTitle } from "@/components/ui";
import { DataRequestForm, ProfileForm } from "@/components/forms";
import { statusLabelNb } from "@/lib/status-labels";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const full = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { customerProfile: true, providerProfile: true, dataRequests: { orderBy: { createdAt: "desc" }, take: 8 } },
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
          <div className="mt-3 space-y-2">
            <p className="font-semibold">{full.providerProfile.companyName}</p>
            <p>Org.nr {full.providerProfile.orgNumber}</p>
            <OrgBadgeList profile={full.providerProfile} />
            {full.providerProfile.orgRegisterName ? (
              <p className="text-xs text-ink-soft">
                Navn i Enhetsregisteret: {full.providerProfile.orgRegisterName}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 font-serif text-xl">Rediger profil</h2>
        <ProfileForm user={full} />
      </div>
      <div className="card space-y-3 p-5 sm:p-6">
        <h2 className="font-serif text-xl">Innsyn, eksport og sletting</h2>
        <p className="text-sm text-ink-soft">
          Last ned dine data, eller be admin om sletting. Regnskaps- og tvistopplysninger beholdes.
        </p>
        <p>
          <Link href="/api/me/export" className="btn btn-secondary">
            Last ned eksport (JSON)
          </Link>
        </p>
        <DataRequestForm />
        {full.dataRequests.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {full.dataRequests.map((request) => (
              <li key={request.id}>
                {request.type} · {statusLabelNb(request.status)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
