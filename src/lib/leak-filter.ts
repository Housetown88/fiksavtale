export type LeakMatch = {
  type: "phone" | "email" | "url";
  excerpt: string;
};

const EMAIL =
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const EMAIL_BYPASS =
  /\b[\w.-]+\s*(?:\(?\s*at\s*\)?|\[at\]|\(at\))\s*[\w.-]+\s*(?:\(?\s*dot\s*\)?|\[dot\]|\(dot\))\s*[a-z]{2,}\b/gi;

const URL =
  /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|telegram\.me|bit\.ly|tinyurl\.com)\/\S+|\b[a-z0-9-]+\.(?:no|com|net|org|io|app)\b/gi;

const PHONE_INTERNATIONAL =
  /(?:\+|00|pluss\s*|plus\s*)47[\s./-]*\d(?:[\s./-]*\d){7}/gi;
const PHONE_LOCAL =
  /(?<!\d)(?:\d[\s./-]*){8}(?!\d)/g;

function excerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 8);
  const end = Math.min(text.length, index + length + 8);
  return text.slice(start, end).trim();
}

function collect(text: string, pattern: RegExp, type: LeakMatch["type"]): LeakMatch[] {
  const matches: LeakMatch[] = [];
  const clone = new RegExp(pattern.source, pattern.flags);
  let match: RegExpExecArray | null;
  while ((match = clone.exec(text)) !== null) {
    matches.push({ type, excerpt: excerpt(text, match.index, match[0].length) });
  }
  return matches;
}

function looksLikeOrgNumberContext(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 18), index).toLowerCase();
  return /org\.?\s*nr|organisasjonsnr|orgnr/.test(before);
}

function collectPhones(text: string): LeakMatch[] {
  const matches: LeakMatch[] = [];
  matches.push(...collect(text, PHONE_INTERNATIONAL, "phone"));

  const local = new RegExp(PHONE_LOCAL.source, PHONE_LOCAL.flags);
  let match: RegExpExecArray | null;
  while ((match = local.exec(text)) !== null) {
    if (looksLikeOrgNumberContext(text, match.index)) continue;
    const digits = match[0].replace(/\D/g, "");
    if (digits.length !== 8) continue;
    matches.push({ type: "phone", excerpt: excerpt(text, match.index, match[0].length) });
  }
  return matches;
}

export function findContactLeaks(text: string): LeakMatch[] {
  if (!text) return [];
  return [
    ...collect(text, EMAIL, "email"),
    ...collect(text, EMAIL_BYPASS, "email"),
    ...collect(text, URL, "url"),
    ...collectPhones(text),
  ];
}

export function assertNoContactLeak(text: string): void {
  const leaks = findContactLeaks(text);
  if (leaks.length === 0) return;
  const kinds = [...new Set(leaks.map((item) => item.type))];
  const labels: Record<LeakMatch["type"], string> = {
    phone: "telefonnummer",
    email: "e-postadresse",
    url: "lenke",
  };
  throw new LeakFilterError(
    `Teksten ser ut til å inneholde ${kinds.map((kind) => labels[kind]).join(", ")}. Fjern direkte kontaktinfo — den låses opp etter bekreftet betaling. Hvis dette er en feil, juster teksten og prøv igjen, eller meld fra til oss.`,
    leaks,
  );
}

export class LeakFilterError extends Error {
  leaks: LeakMatch[];

  constructor(message: string, leaks: LeakMatch[]) {
    super(message);
    this.name = "LeakFilterError";
    this.leaks = leaks;
  }
}
