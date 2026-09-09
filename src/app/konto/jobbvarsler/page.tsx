import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { JobAlertSettingsForm } from "@/components/JobAlertSettingsForm";
import { JobAlertStatusBadge } from "@/components/JobAlertStatusBadge";
import { emailConfigured } from "@/lib/email";
import { asStringArray, jobAlertSettingsHint, parsePreference } from "@/lib/job-alerts";

export default async function JobAlertsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  if (user.role !== "PROVIDER") redirect("/konto");

  const pref = await db.jobAlertPreference.findUnique({ where: { userId: user.id } });
  const parsed = pref ? parsePreference(pref) : { categories: [], areas: [], radiusKm: null, emailEnabled: false, paused: false };
  const hint = jobAlertSettingsHint(parsed, emailConfigured());

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle kicker="Innstillinger" title="Jobbvarsler – hvilke oppdrag ønsker du å motta?">
        Velg fag og områder. Bare bedrifter som matcher både type og sted får e-post når et nytt oppdrag publiseres.
      </PageTitle>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <JobAlertStatusBadge status={hint.status} />
        <p className="text-sm text-ink-soft">{hint.emailStatusLabel}</p>
      </div>
      {!hint.emailConfigured ? (
        <p className="text-sm text-ink-soft">
          E-postutsendelse er ikke konfigurert i dette miljøet (mangler Resend). Valgene dine lagres, men vi hevder
          ikke at e-post er sendt.
        </p>
      ) : null}
      <div className="card p-5 sm:p-6">
        <JobAlertSettingsForm
          initial={{
            categories: asStringArray(pref?.categories),
            areas: asStringArray(pref?.areas),
            radiusKm: parsed.radiusKm,
            emailEnabled: parsed.emailEnabled,
            paused: parsed.paused,
          }}
        />
      </div>
      <p className="text-sm">
        <Link href="/konto" className="font-semibold text-moss hover:underline">
          Tilbake til konto
        </Link>
      </p>
    </div>
  );
}
