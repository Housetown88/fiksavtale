import { notFound, redirect } from "next/navigation";
import { JobForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) notFound();
  if (job.customerId !== user.id && user.role !== "ADMIN") notFound();
  if (job.status !== "OPEN") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageTitle title="Kan ikke redigeres">
          Oppdraget er ikke lenger åpent. Felt låses når et tilbud er valgt eller bookingen er i gang.
        </PageTitle>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle kicker="Rediger" title="Oppdater oppdraget">
        Du kan endre åpne oppdrag. Etter valgt tilbud eller booking låses feltene.
      </PageTitle>
      <div className="card p-5 sm:p-6">
        <JobForm
          jobId={job.id}
          initial={{
            title: job.title,
            description: job.description,
            category: job.category,
            subcategory: job.subcategory ?? "",
            area: job.area,
            addressLine: job.addressLine ?? "",
            postalCode: job.postalCode ?? "",
            budgetMin: job.budgetMinOre != null ? String(Math.round(job.budgetMinOre / 100)) : "",
            budgetMax: job.budgetMaxOre != null ? String(Math.round(job.budgetMaxOre / 100)) : "",
          }}
        />
      </div>
    </div>
  );
}
