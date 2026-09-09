import { Prisma, type Job, type JobAlertPreference, type PrismaClient } from "@prisma/client";
import { AuthzError, type Viewer } from "./authz";
import {
  isParentCategorySlug,
  isSubcategorySlug,
  jobTypeLabel,
  parentCategorySlug,
  parseRadiusKm,
  sanitizeAreas,
  sanitizeCategorySlugs,
  type JobAlertRadiusKm,
} from "./categories";
import {
  appBaseUrl,
  emailConfigured,
  jobAlertEmailHtml,
  jobAlertEmailSubject,
  jobAlertEmailText,
  sendTransactionalEmail,
  type EmailSendResult,
} from "./email";
import { formatBudgetRange } from "./budget";
import { formatNok } from "./money";

export const JOB_ALERT_STATUSES = ["AKTIVERT", "PAUSET", "AV"] as const;
export type JobAlertUiStatus = (typeof JOB_ALERT_STATUSES)[number];

export type JobAlertMatchJob = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  area: string;
  addressLine?: string | null;
  postalCode?: string | null;
  budgetMinOre: number | null;
  budgetMaxOre: number | null;
  status: string;
  createdAt: Date;
};

export type ParsedJobAlertPreference = {
  categories: string[];
  areas: string[];
  radiusKm: JobAlertRadiusKm | null;
  emailEnabled: boolean;
  paused: boolean;
};

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parsePreference(pref: Pick<JobAlertPreference, "categories" | "areas" | "radiusKm" | "emailEnabled" | "paused">): ParsedJobAlertPreference {
  return {
    categories: sanitizeCategorySlugs(asStringArray(pref.categories)),
    areas: sanitizeAreas(asStringArray(pref.areas)),
    radiusKm: parseRadiusKm(pref.radiusKm),
    emailEnabled: pref.emailEnabled,
    paused: pref.paused,
  };
}

export function jobAlertUiStatus(pref: ParsedJobAlertPreference | null | undefined): JobAlertUiStatus {
  if (!pref || !pref.emailEnabled) return "AV";
  if (pref.paused) return "PAUSET";
  if (pref.categories.length === 0 || pref.areas.length === 0) return "AV";
  return "AKTIVERT";
}

/**
 * Kategori treffer hvis bedriften har valgt foreldrekategorien
 * eller den konkrete underkategorien på oppdraget.
 * Å velge bare «Stubbefresing» gir ikke varsel for «Trefelling».
 */
export function categoryPreferenceMatches(
  selected: string[],
  job: { category: string; subcategory?: string | null },
): boolean {
  if (selected.length === 0) return false;
  const wanted = new Set(selected);
  if (wanted.has(job.category)) return true;
  if (job.subcategory && wanted.has(job.subcategory)) return true;
  return false;
}

export function areaPreferenceMatches(selected: string[], jobArea: string): boolean {
  if (selected.length === 0) return false;
  return selected.includes(jobArea);
}

export function preferenceMatchesJob(pref: ParsedJobAlertPreference, job: JobAlertMatchJob): boolean {
  if (!pref.emailEnabled || pref.paused) return false;
  if (job.status !== "OPEN") return false;
  return (
    categoryPreferenceMatches(pref.categories, job) && areaPreferenceMatches(pref.areas, job.area)
  );
}

export function assertValidJobTaxonomy(category: string, subcategory?: string | null) {
  if (!isParentCategorySlug(category)) {
    throw new Error("Ugyldig kategori.");
  }
  if (!subcategory) return;
  if (!isSubcategorySlug(subcategory) || parentCategorySlug(subcategory) !== category) {
    throw new Error("Underkategorien hører ikke til valgt fag.");
  }
}

function shortDescription(text: string, max = 280): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function buildJobAlertContent(job: JobAlertMatchJob) {
  const typeLabel = jobTypeLabel(job.category, job.subcategory);
  const jobUrl = `${appBaseUrl().replace(/\/$/, "")}/oppdrag/${encodeURIComponent(job.id)}`;
  const budget = formatBudgetRange(job.budgetMinOre, job.budgetMaxOre, formatNok);
  const published = job.createdAt.toLocaleString("nb-NO", {
    timeZone: "Europe/Oslo",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const payload = {
    typeLabel,
    area: job.area,
    title: job.title,
    description: shortDescription(job.description),
    budget: job.budgetMinOre != null || job.budgetMaxOre != null ? budget : null,
    publishedAt: published,
    jobUrl,
  };
  return {
    ...payload,
    subject: jobAlertEmailSubject(typeLabel),
    html: jobAlertEmailHtml(payload),
    text: jobAlertEmailText(payload),
  };
}

export async function getProviderAlertPreference(db: PrismaClient, userId: string) {
  return db.jobAlertPreference.findUnique({ where: { userId } });
}

export async function ensureProviderAlertPreference(
  db: PrismaClient,
  userId: string,
  input?: {
    categories?: string[];
    areas?: string[];
    radiusKm?: number | null;
    emailEnabled?: boolean;
    paused?: boolean;
  },
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { providerProfile: true, jobAlertPreference: true },
  });
  if (!user || user.role !== "PROVIDER" || !user.providerProfile) {
    throw new AuthzError("Bare bedriftskontoer kan ha jobbvarsler", 403);
  }
  const data = {
    categories: sanitizeCategorySlugs(input?.categories ?? []),
    areas: sanitizeAreas(input?.areas ?? []),
    radiusKm: parseRadiusKm(input?.radiusKm ?? null),
    emailEnabled: Boolean(input?.emailEnabled),
    paused: Boolean(input?.paused),
  };
  if (user.jobAlertPreference) {
    return db.jobAlertPreference.update({
      where: { id: user.jobAlertPreference.id },
      data,
    });
  }
  return db.jobAlertPreference.create({
    data: {
      userId: user.id,
      providerProfileId: user.providerProfile.id,
      ...data,
    },
  });
}

export async function saveJobAlertPreference(
  db: PrismaClient,
  viewer: Viewer,
  input: {
    categories: string[];
    areas: string[];
    radiusKm?: number | null;
    emailEnabled: boolean;
    paused: boolean;
  },
) {
  if (viewer.role !== "PROVIDER") {
    throw new AuthzError("Bare bedriftskontoer kan endre jobbvarsler", 403);
  }
  return ensureProviderAlertPreference(db, viewer.id, input);
}

async function claimDelivery(db: PrismaClient, jobId: string, providerId: string): Promise<boolean> {
  try {
    await db.jobAlertDelivery.create({
      data: { jobId, providerId, status: "PENDING" },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

function deliveryStatusFromSend(result: EmailSendResult): { status: string; sentAt: Date | null } {
  if (result.sent) return { status: "SENT", sentAt: new Date() };
  if (result.reason === "not_configured") return { status: "QUEUED", sentAt: null };
  return { status: "FAILED", sentAt: null };
}

export async function dispatchJobAlerts(
  db: PrismaClient,
  job: JobAlertMatchJob | Job,
): Promise<{ matched: number; sent: number; queued: number; skipped: number }> {
  const summary = { matched: 0, sent: 0, queued: 0, skipped: 0 };
  if (job.status !== "OPEN") return summary;

  const prefs = await db.jobAlertPreference.findMany({
    where: {
      emailEnabled: true,
      paused: false,
      user: { role: "PROVIDER", deletedAt: null },
    },
    include: { user: { select: { id: true, email: true, deletedAt: true } } },
  });

  for (const pref of prefs) {
    const parsed = parsePreference(pref);
    if (!preferenceMatchesJob(parsed, job)) continue;
    summary.matched += 1;
    const claimed = await claimDelivery(db, job.id, pref.userId);
    if (!claimed) {
      summary.skipped += 1;
      continue;
    }
    const content = buildJobAlertContent(job);
    const result = await sendTransactionalEmail({
      to: pref.user.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    const delivery = deliveryStatusFromSend(result);
    await db.jobAlertDelivery.update({
      where: { jobId_providerId: { jobId: job.id, providerId: pref.userId } },
      data: delivery,
    });
    if (delivery.status === "SENT") summary.sent += 1;
    else if (delivery.status === "QUEUED") {
      summary.queued += 1;
      console.info("job-alert-queued", job.id, pref.userId, "not_configured");
    } else {
      console.error("job-alert-failed", job.id, pref.userId);
    }
  }
  return summary;
}

export function jobAlertSettingsHint(pref: ParsedJobAlertPreference | null, configured: boolean = emailConfigured()) {
  const status = jobAlertUiStatus(pref);
  return {
    status,
    emailConfigured: configured,
    emailStatusLabel: configured ? "E-post er konfigurert" : "E-post ikke konfigurert",
    canSend: configured && status === "AKTIVERT",
  };
}

export { emailConfigured, appBaseUrl };
