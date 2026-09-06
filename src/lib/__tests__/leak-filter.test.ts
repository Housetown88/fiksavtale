import { describe, expect, it } from "vitest";
import { assertNoContactLeak, findContactLeaks, LeakFilterError } from "../leak-filter";

describe("lekasjefilter for kontaktinfo", () => {
  it("slipper gjennom vanlig oppdragsbeskrivelse", () => {
    expect(
      findContactLeaks("Trenger elektriker til sikringsskap. Budsjett rundt 5000 kroner i Oslo."),
    ).toEqual([]);
  });

  it("fanger norske telefonnummer og +47", () => {
    expect(findContactLeaks("Ring meg på 400 12 345").length).toBeGreaterThan(0);
    expect(findContactLeaks("Ring +47 40012345").length).toBeGreaterThan(0);
  });

  it("fanger e-post og at/dot-omskriving", () => {
    expect(findContactLeaks("Skriv til kari@example.no").some((m) => m.type === "email")).toBe(true);
    expect(findContactLeaks("kari at example dot no").some((m) => m.type === "email")).toBe(true);
  });

  it("fanger URL-er som prøver å omgå chatten", () => {
    expect(findContactLeaks("Se mer på www.eksempel.no").some((m) => m.type === "url")).toBe(true);
    expect(findContactLeaks("https://wa.me/4740012345").some((m) => m.type === "url")).toBe(true);
  });

  it("lar merket organisasjonsnummer passere", () => {
    expect(findContactLeaks("Org.nr 918 273 646 er sjekket i DEMO.")).toEqual([]);
  });

  it("gir vennlig norsk feilmelding som kan rettes", () => {
    expect(() => assertNoContactLeak("Mail meg på kari@eksempel.no")).toThrow(LeakFilterError);
    try {
      assertNoContactLeak("Mail meg på kari@eksempel.no");
    } catch (error) {
      expect(error).toBeInstanceOf(LeakFilterError);
      expect((error as LeakFilterError).message).toContain("juster teksten");
    }
  });
});
