export const DEFAULT_PLATFORM_FEE_BPS = 1000;

export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}

export function oreToNokNumber(ore: number): number {
  return ore / 100;
}

export function formatNok(ore: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(ore / 100);
}

export function calcCommission(amountOre: number, platformFeeBps: number) {
  if (amountOre < 0) {
    throw new Error("Beløp kan ikke være negativt");
  }
  if (platformFeeBps < 0 || platformFeeBps > 10_000) {
    throw new Error("Ugyldig gebyrsats");
  }
  const platformFeeOre = Math.round((amountOre * platformFeeBps) / 10_000);
  const providerPayoutOre = amountOre - platformFeeOre;
  return { platformFeeOre, providerPayoutOre, platformFeeBps };
}
