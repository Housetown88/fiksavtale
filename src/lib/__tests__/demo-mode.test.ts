import { afterEach, describe, expect, it } from "vitest";
import {
  adminDemoAllowed,
  allowDemoHints,
  assertStrongAdminPassword,
  canUnlockViaDemoPayment,
  demoPaymentsAllowed,
  isKnownDemoEmail,
  isProductionRuntime,
} from "../demo-mode";

const keys = ["NODE_ENV", "VERCEL_ENV", "ALLOW_DEMO_HINTS", "DEMO", "ADMIN_DEMO_ALLOWED", "ALLOW_DEMO_PAYMENTS"] as const;
const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (snapshot[key] == null) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

describe("demo-modus", () => {
  it("skjuler demo-hint i produksjon med mindre ALLOW_DEMO_HINTS=1", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ALLOW_DEMO_HINTS;
    delete process.env.DEMO;
    expect(isProductionRuntime()).toBe(true);
    expect(allowDemoHints()).toBe(false);
    process.env.ALLOW_DEMO_HINTS = "1";
    expect(allowDemoHints()).toBe(true);
  });

  it("blokkerer demo-admin i produksjon uten ADMIN_DEMO_ALLOWED", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ADMIN_DEMO_ALLOWED;
    expect(adminDemoAllowed()).toBe(false);
    process.env.ADMIN_DEMO_ALLOWED = "1";
    expect(adminDemoAllowed()).toBe(true);
  });

  it("kjenner igjen demo-e-poster", () => {
    expect(isKnownDemoEmail("kari@demo.jobbenmin.no")).toBe(true);
    expect(isKnownDemoEmail("anne@firma.no")).toBe(false);
  });

  it("blokkerer DEMO-opplåsing av ekte kunder i produksjon", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ALLOW_DEMO_PAYMENTS;
    expect(demoPaymentsAllowed()).toBe(false);
    expect(canUnlockViaDemoPayment("kari@kunde.no")).toBe(false);
    expect(canUnlockViaDemoPayment("kari@demo.jobbenmin.no")).toBe(false);
  });

  it("avviser svakt admin-passord", () => {
    expect(() => assertStrongAdminPassword("Demo1234!")).toThrow();
    expect(() => assertStrongAdminPassword("kort")).toThrow();
    expect(() => assertStrongAdminPassword("et-sterkt-unikt-adminpassord")).not.toThrow();
  });
});
