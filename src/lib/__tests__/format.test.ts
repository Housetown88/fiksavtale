import { describe, expect, it } from "vitest";
import { formatRelativeNb, initialsFromName } from "../format";

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
