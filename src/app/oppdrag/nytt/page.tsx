import { redirect } from "next/navigation";
import { JobForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  if (user.role !== "CUSTOMER" && user.role !== "ADMIN") {
    return <p>Bare kundekontoer kan legge ut oppdrag.</p>;
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle kicker="Nytt oppdrag" title="Fortell hva som skal fikses">
        Skriv område, ikke telefonnummer. Adressen låses til den betalte bookingen.
      </PageTitle>
      <div className="card p-5">
        <JobForm />
      </div>
    </div>
  );
}
