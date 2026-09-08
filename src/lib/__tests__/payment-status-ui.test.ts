import { describe, expect, it } from "vitest";
import { paymentConfirmView } from "../payment-status-ui";

describe("betalingsstatus-tekst", () => {
  it("viser bekreftet når bookingen er betalt", () => {
    const view = paymentConfirmView({
      bookingStatus: "PAID",
      intentStatus: "SUCCEEDED",
      contactUnlocked: true,
    });
    expect(view.title).toMatch(/bekreftet/i);
    expect(view.showRetry).toBe(false);
  });

  it("gir retry ved feilet og avbrutt", () => {
    expect(
      paymentConfirmView({ bookingStatus: "PENDING_PAYMENT", intentStatus: "FAILED", contactUnlocked: false }).title,
    ).toMatch(/feilet/i);
    expect(
      paymentConfirmView({ bookingStatus: "PENDING_PAYMENT", intentStatus: "CANCELLED", contactUnlocked: false })
        .showRetry,
    ).toBe(true);
  });

  it("sier ikke ferdig når intensjonen fortsatt venter", () => {
    const view = paymentConfirmView({
      bookingStatus: "PENDING_PAYMENT",
      intentStatus: "PENDING",
      contactUnlocked: false,
    });
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(view.showSimulate).toBe(true);
    expect(view.nextAction).toBeTruthy();
    expect(`${view.title} ${view.body} ${view.nextAction}`).not.toMatch(/webhook/i);
  });
});
