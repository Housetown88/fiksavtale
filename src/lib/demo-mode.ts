export const DEMO_ADMIN_EMAIL = "admin@demo.jobbenmin.no";
export const WEAK_DEMO_PASSWORD = "Demo1234!";

const KNOWN_DEMO_EMAILS = new Set([
  "kari@demo.jobbenmin.no",
  "ola@demo.jobbenmin.no",
  "admin@demo.jobbenmin.no",
  "bjorn@nordfjell.no",
  "silje@osloror.no",
]);

export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

function flagOn(name: string): boolean {
  const value = process.env[name];
  return value === "1" || value === "true";
}

/** Customer-facing demo password / seed-account hints. Default off in production. */
export function allowDemoHints(): boolean {
  if (process.env.ALLOW_DEMO_HINTS === "0" || process.env.ALLOW_DEMO_HINTS === "false") {
    return false;
  }
  if (flagOn("ALLOW_DEMO_HINTS") || flagOn("DEMO")) return true;
  return !isProductionRuntime();
}

/** Weak shared admin@demo login. Off in production unless explicitly allowed. */
export function adminDemoAllowed(): boolean {
  if (flagOn("ADMIN_DEMO_ALLOWED")) return true;
  return !isProductionRuntime();
}

export function isDemoAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;
}

export function isKnownDemoEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return KNOWN_DEMO_EMAILS.has(normalized) || normalized.endsWith("@demo.jobbenmin.no");
}

export function shouldSeedDemoAdmin(): boolean {
  return adminDemoAllowed();
}

export function assertStrongAdminPassword(password: string): void {
  if (!password || password.length < 16) {
    throw new Error("Admin-passord må ha minst 16 tegn.");
  }
  if (password === WEAK_DEMO_PASSWORD) {
    throw new Error("Kan ikke bruke det delte DEMO-passordet som produksjonsadmin.");
  }
}

/** DEMO-webhook kan aldri låse opp ekte kundedata i produksjon. */
export function demoPaymentsAllowed(): boolean {
  if (flagOn("ALLOW_DEMO_PAYMENTS")) return true;
  return !isProductionRuntime();
}

export function canUnlockViaDemoPayment(customerEmail: string): boolean {
  if (!isProductionRuntime()) return true;
  return demoPaymentsAllowed() && isKnownDemoEmail(customerEmail);
}

export function bootstrapAdminCredentials(): { email: string; password: string } | null {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
  if (!email || !password) return null;
  assertStrongAdminPassword(password);
  return { email, password };
}
