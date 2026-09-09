export type CategoryChild = {
  slug: string;
  label: string;
};

export type CategoryParent = {
  slug: string;
  label: string;
  children: readonly CategoryChild[];
};

/**
 * Én taksonomi for markedsplass, jobbskjema og jobbvarsler.
 * Foreldreslug brukes på Job.category (bakoverkompatibelt filter).
 * Barn lagres i Job.subcategory når kunden velger mer spesifikt.
 */
export const JOB_CATEGORY_TREE: readonly CategoryParent[] = [
  {
    slug: "rorlegger",
    label: "Rørlegger",
    children: [
      { slug: "rorlegger.rorarbeid", label: "Rørarbeid" },
      { slug: "rorlegger.bad", label: "Bad og våtrom" },
      { slug: "rorlegger.varmtvann", label: "Varmtvannsbereder" },
      { slug: "rorlegger.avlop", label: "Tett avløp" },
    ],
  },
  {
    slug: "elektriker",
    label: "Elektriker",
    children: [
      { slug: "elektriker.elarbeid", label: "Elektrikerarbeid" },
      { slug: "elektriker.elbillader", label: "Elbillader" },
      { slug: "elektriker.sikringsskap", label: "Sikringsskap" },
      { slug: "elektriker.belysning", label: "Belysning" },
    ],
  },
  {
    slug: "snekker",
    label: "Snekker",
    children: [
      { slug: "snekker.kjokken", label: "Kjøkken" },
      { slug: "snekker.dorer", label: "Dører og vinduer" },
      { slug: "snekker.gulv", label: "Gulv" },
      { slug: "snekker.innredning", label: "Innredning" },
    ],
  },
  {
    slug: "maling",
    label: "Maling og tapet",
    children: [
      { slug: "maling.inne", label: "Innendørs maling" },
      { slug: "maling.ute", label: "Utendørs maling" },
      { slug: "maling.tapet", label: "Tapetsering" },
    ],
  },
  {
    slug: "renhold",
    label: "Renhold",
    children: [
      { slug: "renhold.hjem", label: "Hjemmerengjøring" },
      { slug: "renhold.flyttevask", label: "Flyttevask" },
      { slug: "renhold.vindu", label: "Vinduspuss" },
    ],
  },
  {
    slug: "hage",
    label: "Hage og utendørs",
    children: [
      { slug: "hage.stubbefresing", label: "Stubbefresing" },
      { slug: "hage.trefelling", label: "Trefelling" },
      { slug: "hage.beskjaering", label: "Beskjæring" },
      { slug: "hage.plen", label: "Plenklipping" },
      { slug: "hage.gjerde", label: "Gjerde og platting" },
      { slug: "hage.snomaking", label: "Snømåking" },
    ],
  },
  {
    slug: "flytting",
    label: "Flytting",
    children: [
      { slug: "flytting.hjelp", label: "Flyttehjelp" },
      { slug: "flytting.montering", label: "Møbelmontering" },
    ],
  },
  {
    slug: "data",
    label: "Data og IKT",
    children: [
      { slug: "data.hjelp", label: "Datahjelp" },
      { slug: "data.nettverk", label: "WiFi og nettverk" },
      { slug: "data.smarthjem", label: "Smart hjem" },
    ],
  },
] as const;

export const JOB_CATEGORIES = JOB_CATEGORY_TREE.map((item) => ({
  slug: item.slug,
  label: item.label,
}));

export type CategorySlug = (typeof JOB_CATEGORY_TREE)[number]["slug"];

export const JOB_ALERT_RADIUS_KM = [10, 25, 50, 100] as const;
export type JobAlertRadiusKm = (typeof JOB_ALERT_RADIUS_KM)[number];

const LABEL_BY_SLUG = new Map<string, string>();
const PARENT_BY_SLUG = new Map<string, string>();
const CHILD_SLUGS = new Set<string>();

for (const parent of JOB_CATEGORY_TREE) {
  LABEL_BY_SLUG.set(parent.slug, parent.label);
  PARENT_BY_SLUG.set(parent.slug, parent.slug);
  for (const child of parent.children) {
    LABEL_BY_SLUG.set(child.slug, child.label);
    PARENT_BY_SLUG.set(child.slug, parent.slug);
    CHILD_SLUGS.add(child.slug);
  }
}

export function categoryLabel(slug: string): string {
  return LABEL_BY_SLUG.get(slug) ?? slug;
}

export function parentCategorySlug(slug: string): string {
  return PARENT_BY_SLUG.get(slug) ?? slug;
}

export function isParentCategorySlug(slug: string): slug is CategorySlug {
  return JOB_CATEGORY_TREE.some((item) => item.slug === slug);
}

export function isKnownCategorySlug(slug: string): boolean {
  return LABEL_BY_SLUG.has(slug);
}

export function isSubcategorySlug(slug: string): boolean {
  return CHILD_SLUGS.has(slug);
}

export function childrenOf(parentSlug: string): readonly CategoryChild[] {
  return JOB_CATEGORY_TREE.find((item) => item.slug === parentSlug)?.children ?? [];
}

export function allSelectableCategorySlugs(): string[] {
  return JOB_CATEGORY_TREE.flatMap((parent) => [parent.slug, ...parent.children.map((child) => child.slug)]);
}

export function jobTypeLabel(category: string, subcategory?: string | null): string {
  if (subcategory && LABEL_BY_SLUG.has(subcategory)) {
    return categoryLabel(subcategory);
  }
  return categoryLabel(category);
}

export function jobTypeFullLabel(category: string, subcategory?: string | null): string {
  const parent = categoryLabel(category);
  if (subcategory && LABEL_BY_SLUG.has(subcategory) && subcategory !== category) {
    return `${parent} · ${categoryLabel(subcategory)}`;
  }
  return parent;
}

export function sanitizeCategorySlugs(slugs: string[]): string[] {
  const allowed = new Set(allSelectableCategorySlugs());
  return [...new Set(slugs.filter((slug) => allowed.has(slug)))];
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

export type OsloArea = (typeof OSLO_AREAS)[number];

export function isKnownArea(area: string): area is OsloArea {
  return (OSLO_AREAS as readonly string[]).includes(area);
}

export function sanitizeAreas(areas: string[]): string[] {
  return [...new Set(areas.filter(isKnownArea))];
}

export function parseRadiusKm(value: unknown): JobAlertRadiusKm | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if ((JOB_ALERT_RADIUS_KM as readonly number[]).includes(n)) {
    return n as JobAlertRadiusKm;
  }
  return null;
}
