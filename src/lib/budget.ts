import { nokToOre } from "./money";

export type BudgetRange = {
  budgetMinOre: number | null;
  budgetMaxOre: number | null;
};

function parseOptionalNok(raw: unknown, label: string): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (text === "") return null;
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new Error(`${label} må være et tall.`);
  }
  if (value < 0) {
    throw new Error(`${label} kan ikke være negativt.`);
  }
  return nokToOre(value);
}

export function parseBudgetRange(input: {
  budgetMin?: unknown;
  budgetMax?: unknown;
}): BudgetRange {
  const budgetMinOre = parseOptionalNok(input.budgetMin, "Budsjett fra");
  const budgetMaxOre = parseOptionalNok(input.budgetMax, "Budsjett til");
  if (budgetMinOre != null && budgetMaxOre != null && budgetMinOre > budgetMaxOre) {
    throw new Error("Budsjett fra kan ikke være høyere enn budsjett til.");
  }
  return { budgetMinOre, budgetMaxOre };
}

export function formatBudgetRange(minOre: number | null, maxOre: number | null, formatNok: (ore: number) => string): string {
  if (minOre != null && maxOre != null) {
    return `${formatNok(minOre)} – ${formatNok(maxOre)}`;
  }
  if (minOre != null) return `Fra ${formatNok(minOre)}`;
  if (maxOre != null) return `Inntil ${formatNok(maxOre)}`;
  return "Budsjett etter avtale";
}
