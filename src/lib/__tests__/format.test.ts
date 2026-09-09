import { describe, expect, it } from "vitest";
import { formatRelativeNb, formatOsloDateTime, initialsFromName } from "../format";

describe("formatRelativeNb", () => {
  it("beskriver nettopp publisert tid", () => {
    expect(formatRelativeNb(new Date())).toBe("Akkurat nå");
  });

  it("viser minutter", () => {
    const date = new Date(Date.now() - 12 * 60_000);
    expect(formatRelativeNb(date)).toBe("12 min siden");
  });
});

describe("initialsFromName", () => {
  it("tar to første ord", () => {
    expect(initialsFromName("Oslo Rør & Bad AS")).toBe("OR");
  });

  it("tåler tomt navn", () => {
    expect(initialsFromName("")).toBe("?");
  });
});

describe("formatOsloDateTime", () => {
  it("viser dato og klokke i Europe/Oslo", () => {
    const label = formatOsloDateTime(new Date("2026-01-15T12:00:00.000Z"));
    expect(label).toMatch(/15/);
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/13[:.]00/);
  });
});
