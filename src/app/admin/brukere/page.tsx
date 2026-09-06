import { db } from "@/lib/db";
import { PageTitle, VerifiedBadge } from "@/components/ui";
import { adminToggleVerifyAction } from "@/app/actions";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    include: { providerProfile: true, customerProfile: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageTitle title="Brukere" />
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="card p-4 text-sm">
            <p className="font-semibold">
              {user.name} · {user.role} · {user.email}
            </p>
            {user.providerProfile ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span>{user.providerProfile.companyName} · {user.providerProfile.orgNumber}</span>
                <VerifiedBadge checked={user.providerProfile.orgVerified} />
                <form action={adminToggleVerifyAction}>
                  <input type="hidden" name="profileId" value={user.providerProfile.id} />
                  <input type="hidden" name="orgVerified" value={user.providerProfile.orgVerified ? "false" : "true"} />
                  <button className="btn btn-secondary px-3 py-1 text-xs" type="submit">
                    {user.providerProfile.orgVerified ? "Fjern merke" : "Merk org.nr sjekket"}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
