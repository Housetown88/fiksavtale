import { isValidOrgNumber, normalizeOrgNumber } from "./orgnr";

export type OrgRegisterStatus =
  | "NOT_CHECKED"
  | "FOUND"
  | "NAME_MATCH"
  | "NAME_MISMATCH"
  | "NOT_FOUND"
  | "LOOKUP_FAILED";

export type OrgLookupResult = {
  status: OrgRegisterStatus;
  registerName: string | null;
  orgNumber: string;
};

const BRREG_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";

export function normalizeCompanyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(as|asa|ans|da|nuf)\b/g, "")
    .replace(/[^a-z0-9æøå]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(claimed: string, registered: string): boolean {
  const a = normalizeCompanyName(claimed);
  const b = normalizeCompanyName(registered);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export async function lookupOrgInBrreg(
  orgNumber: string,
  companyName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrgLookupResult> {
  const digits = normalizeOrgNumber(orgNumber);
  if (!isValidOrgNumber(digits)) {
    return { status: "NOT_CHECKED", registerName: null, orgNumber: digits };
  }
  try {
    const response = await fetchImpl(`${BRREG_URL}/${digits}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) {
      return { status: "NOT_FOUND", registerName: null, orgNumber: digits };
    }
    if (!response.ok) {
      return { status: "LOOKUP_FAILED", registerName: null, orgNumber: digits };
    }
    const payload = (await response.json()) as { navn?: string };
    const registerName = payload.navn?.trim() || null;
    if (!registerName) {
      return { status: "FOUND", registerName: null, orgNumber: digits };
    }
    return {
      status: namesMatch(companyName, registerName) ? "NAME_MATCH" : "NAME_MISMATCH",
      registerName,
      orgNumber: digits,
    };
  } catch {
    return { status: "LOOKUP_FAILED", registerName: null, orgNumber: digits };
  }
}

export function orgRegisterLabel(status: string): string {
  switch (status) {
    case "NAME_MATCH":
      return "Funnet i Enhetsregisteret, navn stemmer";
    case "NAME_MISMATCH":
      return "Funnet i Enhetsregisteret, navn stemmer ikke";
    case "FOUND":
      return "Funnet i Enhetsregisteret";
    case "NOT_FOUND":
      return "Ikke funnet i Enhetsregisteret";
    case "LOOKUP_FAILED":
      return "Oppslag i Enhetsregisteret feilet";
    default:
      return "Enhetsregisteret ikke sjekket";
  }
}
