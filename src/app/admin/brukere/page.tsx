import { db } from "@/lib/db";
import { Alert, OrgBadgeList, PageTitle } from "@/components/ui";
import { adminLookupOrgAction, adminToggleRepConfirmedAction, adminToggleVerifyAction } from "@/app/actions";
import { isKnownDemoEmail } from "@/lib/demo-mode";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    include: { providerProfile: true, customerProfile: true },
    orderBy: { createdAt: "desc" },
  });
  const hasNonDemo = users.some((user) => !isKnownDemoEmail(user.email));
  return (
    <div>
      <PageTitle title="Brukere">
        Rollebeskyttet. Demo-admin skal ikke brukes mot ekte kontoer.
      </PageTitle>
      {hasNonDemo ? (
        <div className="mb-4">
          <Alert tone="warn">
            Listen inneholder e-poster som ikke er kjente DEMO-kontoer. Ikke bruk delt demo-passord i
            produksjon. Roter eller deaktiver admin@demo.jobbenmin.no, og bruk ADMIN_BOOTSTRAP_EMAIL med
            et unikt sterkt passord.
          </Alert>
        </div>
      ) : null}
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="card p-4 text-sm">
            <p className="font-semibold">
              {user.name} · {user.role} · {user.email}
              {!isKnownDemoEmail(user.email) ? (
                <span className="ml-2 text-xs font-semibold text-copper-deep">Ikke-demo</span>
              ) : (
                <span className="ml-2 text-xs text-ink-soft">DEMO-konto</span>
              )}
            </p>
            {user.providerProfile ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{user.providerProfile.companyName} · {user.providerProfile.orgNumber}</span>
                  <OrgBadgeList profile={user.providerProfile} />
                </div>
                {user.providerProfile.orgRegisterName ? (
                  <p className="text-xs text-ink-soft">
                    Enhetsregisteret: {user.providerProfile.orgRegisterName}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <form action={adminToggleVerifyAction}>
                    <input type="hidden" name="profileId" value={user.providerProfile.id} />
                    <input type="hidden" name="orgVerified" value={user.providerProfile.orgVerified ? "false" : "true"} />
                    <button className="btn btn-secondary px-3 py-1 text-xs" type="submit">
                      {user.providerProfile.orgVerified ? "Fjern formatmerke" : "Merk org.nr format OK"}
                    </button>
                  </form>
                  <form action={adminLookupOrgAction}>
                    <input type="hidden" name="profileId" value={user.providerProfile.id} />
                    <button className="btn btn-secondary px-3 py-1 text-xs" type="submit">
                      Slå opp i Enhetsregisteret
                    </button>
                  </form>
                  <form action={adminToggleRepConfirmedAction}>
                    <input type="hidden" name="profileId" value={user.providerProfile.id} />
                    <input
                      type="hidden"
                      name="orgRepConfirmed"
                      value={user.providerProfile.orgRepConfirmed ? "false" : "true"}
                    />
                    <button className="btn btn-secondary px-3 py-1 text-xs" type="submit">
                      {user.providerProfile.orgRepConfirmed ? "Fjern signaturrett" : "Bekreft signaturrett"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
