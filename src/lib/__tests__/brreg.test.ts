import { describe, expect, it, vi } from "vitest";
import { lookupOrgInBrreg, namesMatch } from "../brreg";
import { orgNumberWithChecksum } from "../orgnr";

describe("Brreg-oppslag", () => {
  it("matcher firmanavn uten AS-suffiks", () => {
    expect(namesMatch("Nordfjell Elektro AS", "NORDFJELL ELEKTRO AS")).toBe(true);
    expect(namesMatch("Annet Firma AS", "Nordfjell Elektro AS")).toBe(false);
  });

  it("skiller funnet, navnavvik og ikke funnet", async () => {
    const org = orgNumberWithChecksum("91827364");
    const found = await lookupOrgInBrreg(org, "Nordfjell Elektro AS", async () =>
      new Response(JSON.stringify({ navn: "Nordfjell Elektro AS" }), { status: 200 }),
    );
    expect(found.status).toBe("NAME_MATCH");

    const mismatch = await lookupOrgInBrreg(org, "Feil Navn AS", async () =>
      new Response(JSON.stringify({ navn: "Nordfjell Elektro AS" }), { status: 200 }),
    );
    expect(mismatch.status).toBe("NAME_MISMATCH");

    const missing = await lookupOrgInBrreg(org, "Nordfjell Elektro AS", async () =>
      new Response("not found", { status: 404 }),
    );
    expect(missing.status).toBe("NOT_FOUND");
  });

  it("tåler at oppslaget feiler uten å late som bekreftet", async () => {
    const org = orgNumberWithChecksum("91827364");
    const failed = await lookupOrgInBrreg(org, "Nordfjell Elektro AS", async () => {
      throw new Error("nettverk");
    });
    expect(failed.status).toBe("LOOKUP_FAILED");
    expect(failed.registerName).toBeNull();
    vi.unstubAllGlobals();
  });
});
