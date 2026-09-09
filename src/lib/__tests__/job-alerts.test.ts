import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { createJob, registerUser } from "../domain";
import {
  buildJobAlertContent,
  categoryPreferenceMatches,
  dispatchJobAlerts,
  ensureProviderAlertPreference,
  jobAlertUiStatus,
  preferenceMatchesJob,
} from "../job-alerts";
import { orgNumberWithChecksum } from "../orgnr";

const envKeys = ["RESEND_API_KEY", "EMAIL_FROM", "APP_BASE_URL", "APP_URL"] as const;
const snapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

afterEach(() => {
  for (const key of envKeys) {
    if (snapshot[key] == null) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
  vi.unstubAllGlobals();
});

const openJob = {
  id: "job_1",
  title: "Stubbefresing i hagen",
  description: "Fjerne stubbe etter bjørk. Ring ikke, bruk plattformen.",
  category: "hage",
  subcategory: "hage.stubbefresing",
  area: "Grünerløkka",
  addressLine: "Markveien 12",
  postalCode: "0550",
  budgetMinOre: 200_000,
  budgetMaxOre: 400_000,
  status: "OPEN",
  createdAt: new Date("2026-09-09T10:00:00.000Z"),
};

describe("jobbvarsel-matching", () => {
  it("krever både fag og område", () => {
    const pref = {
      categories: ["hage", "hage.stubbefresing"],
      areas: ["Grünerløkka"],
      radiusKm: 25 as const,
      emailEnabled: true,
      paused: false,
    };
    expect(preferenceMatchesJob(pref, openJob)).toBe(true);
    expect(preferenceMatchesJob({ ...pref, areas: ["Frogner"] }, openJob)).toBe(false);
    expect(preferenceMatchesJob({ ...pref, categories: ["elektriker"] }, openJob)).toBe(false);
  });

  it("lar foreldrekategori treffe underkategori, men ikke søsken", () => {
    expect(categoryPreferenceMatches(["hage"], openJob)).toBe(true);
    expect(categoryPreferenceMatches(["hage.stubbefresing"], openJob)).toBe(true);
    expect(categoryPreferenceMatches(["hage.trefelling"], openJob)).toBe(false);
    expect(categoryPreferenceMatches(["hage.trefelling"], { ...openJob, subcategory: null })).toBe(false);
    expect(categoryPreferenceMatches(["hage"], { ...openJob, subcategory: null })).toBe(true);
  });

  it("pause og av slår av sending", () => {
    const base = {
      categories: ["hage"],
      areas: ["Grünerløkka"],
      radiusKm: null,
      emailEnabled: true,
      paused: false,
    };
    expect(jobAlertUiStatus(base)).toBe("AKTIVERT");
    expect(jobAlertUiStatus({ ...base, paused: true })).toBe("PAUSET");
    expect(jobAlertUiStatus({ ...base, emailEnabled: false })).toBe("AV");
    expect(preferenceMatchesJob({ ...base, paused: true }, openJob)).toBe(false);
    expect(preferenceMatchesJob({ ...base, emailEnabled: false }, openJob)).toBe(false);
  });
});

describe("jobbvarsel-e-post", () => {
  it("inkluderer ikke gateadresse, telefon eller e-post", () => {
    process.env.APP_URL = "https://jobbenmin.no";
    const content = buildJobAlertContent({
      ...openJob,
      description: "Fjerne stubbe etter bjørk ved huset.",
    });
    expect(content.subject).toBe("Ny jobb i ditt område – Stubbefresing");
    expect(content.html).toContain("NYTT OPPDRAG SOM PASSER DIN BEDRIFT");
    expect(content.html).toContain("SE OPPDRAG OG GI TILBUD");
    expect(content.html).toContain("https://jobbenmin.no/oppdrag/job_1");
    expect(content.html).toContain("Grünerløkka");
    expect(content.html).not.toContain("Markveien");
    expect(content.html).not.toContain("0550");
    expect(content.text).not.toContain("Markveien");
    expect(content.html).not.toContain("40000001");
    expect(content.html).not.toContain("@test.no");
  });
});

describe("jobbvarsel-utsending", () => {
  it("varsler bare matchende bedrift, er idempotent, pauser og kølegger uten Resend", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const users = await createTestUsers(db);
    await ensureProviderAlertPreference(db, users.provider.id, {
      categories: ["hage", "hage.stubbefresing"],
      areas: ["Grünerløkka"],
      radiusKm: 25,
      emailEnabled: true,
      paused: false,
    });
    await ensureProviderAlertPreference(db, users.otherProvider.id, {
      categories: ["rorlegger"],
      areas: ["Frogner"],
      radiusKm: 10,
      emailEnabled: true,
      paused: false,
    });

    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Stubbefresing i bakgården",
      description: "Fjerne en stor stubbe uten å ringe oss.",
      category: "hage",
      subcategory: "hage.stubbefresing",
      area: "Grünerløkka",
      addressLine: "Markveien 12",
      postalCode: "0550",
      budgetMinOre: 150_000,
    });

    const first = await dispatchJobAlerts(db, job);
    expect(first.matched).toBe(1);
    expect(first.queued).toBe(1);
    expect(first.sent).toBe(0);

    const second = await dispatchJobAlerts(db, job);
    expect(second.skipped).toBe(1);
    const deliveries = await db.jobAlertDelivery.findMany({ where: { jobId: job.id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.providerId).toBe(users.provider.id);
    expect(deliveries[0]?.status).toBe("QUEUED");
    expect(deliveries[0]?.sentAt).toBeNull();

    await ensureProviderAlertPreference(db, users.provider.id, {
      categories: ["hage"],
      areas: ["Grünerløkka"],
      emailEnabled: true,
      paused: true,
    });
    const otherJob = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Ny hagejobb",
      description: "Klipp hekk mot bakgård.",
      category: "hage",
      area: "Grünerløkka",
    });
    const paused = await dispatchJobAlerts(db, otherJob);
    expect(paused.matched).toBe(0);
    expect(await db.jobAlertDelivery.count({ where: { jobId: otherJob.id } })).toBe(0);
  });

  it("sender via Resend når nøkkel er satt og hopper over fremmede bedrifter", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy";
    process.env.EMAIL_FROM = "Jobbenmin <test@example.com>";
    process.env.APP_BASE_URL = "https://jobbenmin.no";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "msg_alert" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const users = await createTestUsers(db);
    await ensureProviderAlertPreference(db, users.provider.id, {
      categories: ["elektriker"],
      areas: ["Frogner"],
      emailEnabled: true,
      paused: false,
    });

    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Bytte sikringsskap",
      description: "Bytte gammelt skap, uten telefonnummer i teksten.",
      category: "elektriker",
      subcategory: "elektriker.sikringsskap",
      area: "Frogner",
      addressLine: "Bygdøy allé 8",
    });

    const result = await dispatchJobAlerts(db, job);
    expect(result.matched).toBe(1);
    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain("Ny jobb i ditt område – Sikringsskap");
    expect(body).toContain("SE OPPDRAG OG GI TILBUD");
    expect(body).toContain(`/oppdrag/${job.id}`);
    expect(body).not.toContain("Bygdøy");
    expect(body).not.toContain(users.customer.phone);
    expect(body).not.toContain(users.customer.email);
    expect(body).not.toContain(users.otherProvider.email);
  });

  it("oppretter varselpreferanse ved firmaregistrering, også når stegene hoppes over", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await registerUser(db, {
      email: `firma-${suffix}@test.no`,
      password: "TestPass123!",
      name: "Ny Bedrift",
      role: "PROVIDER",
      companyName: "Ny Bedrift AS",
      orgNumber: orgNumberWithChecksum("99887766"),
    });
    const pref = await db.jobAlertPreference.findUnique({ where: { userId: user.id } });
    expect(pref).toBeTruthy();
    expect(pref?.emailEnabled).toBe(false);
    expect(pref?.paused).toBe(false);
    expect(jobAlertUiStatus({
      categories: [],
      areas: [],
      radiusKm: null,
      emailEnabled: false,
      paused: false,
    })).toBe("AV");
  });
});
