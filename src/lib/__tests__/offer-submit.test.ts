import { describe, expect, it } from "vitest";
import { AuthzError } from "../authz";
import { LeakFilterError } from "../leak-filter";
import { statusLabelNb } from "../status-labels";
import {
  canShowOfferSuccess,
  OFFER_SEND_FAILED,
  OFFER_STATUS_LABELS,
  offerSendFailureState,
  offerStatusLabelNb,
} from "../offer-submit";

describe("bekreftelse etter sendt tilbud", () => {
  it("viser suksess bare når lagret tilbud matcher sendt-id", () => {
    expect(
      canShowOfferSuccess({ sentOfferId: "offer_1", confirmedOfferId: "offer_1" }),
    ).toBe(true);
    expect(
      canShowOfferSuccess({ sentOfferId: "offer_1", confirmedOfferId: null }),
    ).toBe(false);
    expect(
      canShowOfferSuccess({ sentOfferId: "offer_1", confirmedOfferId: "offer_other" }),
    ).toBe(false);
    expect(canShowOfferSuccess({ sentOfferId: "true", confirmedOfferId: undefined })).toBe(false);
    expect(canShowOfferSuccess({ sentOfferId: undefined, confirmedOfferId: "offer_1" })).toBe(false);
  });

  it("gir aldri ok-flagg ved feil og bevarer pris og melding", () => {
    const state = offerSendFailureState(new Error("db nede"), {
      amount: "4500",
      message: "Vi kan starte mandag.",
    });
    expect(state.error).toBe(OFFER_SEND_FAILED);
    expect(state.fields).toEqual({ amount: "4500", message: "Vi kan starte mandag." });
    expect(state).not.toHaveProperty("ok");
  });

  it("bevarer skjemafelter også for lekkasjefilter", () => {
    const state = offerSendFailureState(
      new LeakFilterError("Teksten ser ut til å inneholde e-postadresse.", [
        { type: "email", excerpt: "hei@firma.no" },
      ]),
      { amount: "3200", message: "Skriv til hei@firma.no" },
    );
    expect(state.fields.amount).toBe("3200");
    expect(state.fields.message).toBe("Skriv til hei@firma.no");
    expect(state.highlights).toEqual(["hei@firma.no"]);
    expect(state).not.toHaveProperty("ok");
  });

  it("bevarer skjemafelter for manglende tilgang", () => {
    const state = offerSendFailureState(new AuthzError("Du må være innlogget", 401), {
      amount: "1800",
      message: "Kan komme torsdag.",
    });
    expect(state.fields).toEqual({ amount: "1800", message: "Kan komme torsdag." });
    expect(state.error).toBe("Du må være innlogget");
  });
});

describe("tilbudsstatus", () => {
  it("mapper OfferStatus til norsk uten falsk «Sett av kunde»", () => {
    expect(offerStatusLabelNb("PENDING")).toBe("Sendt");
    expect(offerStatusLabelNb("ACCEPTED")).toBe("Akseptert");
    expect(offerStatusLabelNb("REJECTED")).toBe("Avslått");
    expect(offerStatusLabelNb("WITHDRAWN")).toBe("Trukket");
    expect(offerStatusLabelNb("EXPIRED")).toBe("Utløpt");
    const labels = Object.values(OFFER_STATUS_LABELS).join(" ").toLowerCase();
    expect(labels).not.toContain("sett av kunde");
    expect(labels).not.toContain("sett av");
    expect(OFFER_STATUS_LABELS).not.toHaveProperty("SEEN");
    expect(OFFER_STATUS_LABELS).not.toHaveProperty("READ");
    expect(OFFER_STATUS_LABELS).not.toHaveProperty("VIEWED");
    expect(statusLabelNb("PENDING")).toBe("Venter");
  });
});
