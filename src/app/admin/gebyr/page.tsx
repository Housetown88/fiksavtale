import { db } from "@/lib/db";
import { getPlatformFeeBps } from "@/lib/settings";
import { adminUpdateFeeAction } from "@/app/actions";
import { PageTitle } from "@/components/ui";

export default async function AdminFeePage() {
  const bps = await getPlatformFeeBps(db);
  return (
    <div className="max-w-lg">
      <PageTitle title="Plattformgebyr">
        1000 bps = 10%. Endringen logges.
      </PageTitle>
      <form action={adminUpdateFeeAction} className="card grid gap-3 p-5">
        <label>
          <span className="label">Gebyr i basispunkter</span>
          <input className="field" name="platformFeeBps" type="number" min={0} max={3000} defaultValue={bps} />
        </label>
        <button className="btn btn-primary" type="submit">
          Lagre sats
        </button>
      </form>
    </div>
  );
}
