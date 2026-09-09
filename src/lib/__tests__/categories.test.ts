import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  childrenOf,
  isKnownCategorySlug,
  jobTypeLabel,
  parentCategorySlug,
  sanitizeAreas,
  sanitizeCategorySlugs,
} from "../categories";

describe("kategoritaksonomi", () => {
  it("har stubbefresing og trefelling under hage", () => {
    const children = childrenOf("hage").map((item) => item.slug);
    expect(children).toContain("hage.stubbefresing");
    expect(children).toContain("hage.trefelling");
    expect(categoryLabel("hage.stubbefresing")).toBe("Stubbefresing");
    expect(parentCategorySlug("hage.stubbefresing")).toBe("hage");
    expect(jobTypeLabel("hage", "hage.stubbefresing")).toBe("Stubbefresing");
  });

  it("beholder eksisterende hovedkategorier", () => {
    expect(isKnownCategorySlug("elektriker")).toBe(true);
    expect(isKnownCategorySlug("rorlegger")).toBe(true);
    expect(categoryLabel("elektriker")).toBe("Elektriker");
  });

  it("saniterer ukjente fag og områder", () => {
    expect(sanitizeCategorySlugs(["hage", "ukjent", "hage.stubbefresing"])).toEqual([
      "hage",
      "hage.stubbefresing",
    ]);
    expect(sanitizeAreas(["Frogner", "Bergen", "Frogner"])).toEqual(["Frogner"]);
  });
});
