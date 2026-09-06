export const JOB_CATEGORIES = [
  { slug: "rorlegger", label: "Rørlegger" },
  { slug: "elektriker", label: "Elektriker" },
  { slug: "snekker", label: "Snekker" },
  { slug: "maling", label: "Maling og tapet" },
  { slug: "renhold", label: "Renhold" },
  { slug: "hage", label: "Hage og utendørs" },
  { slug: "flytting", label: "Flytting" },
  { slug: "data", label: "Data og IKT" },
] as const;

export type CategorySlug = (typeof JOB_CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string): string {
  return JOB_CATEGORIES.find((item) => item.slug === slug)?.label ?? slug;
}

export const OSLO_AREAS = [
  "Grünerløkka",
  "Frogner",
  "Majorstuen",
  "Grønland",
  "Sagene",
  "Tøyen",
  "St. Hanshaugen",
  "Nordstrand",
  "Gamle Oslo",
  "Ullern",
] as const;
