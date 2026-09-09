import { describe, expect, it } from "vitest";
import { demoIntentBadgeStatus, paymentConfirmView } from "../payment-status-ui";

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

  it("viser ikke Bekreftet når intensjon er SUCCEEDED men bookingen venter", () => {
    const view = paymentConfirmView({
      bookingStatus: "PENDING_PAYMENT",
      intentStatus: "SUCCEEDED",
      contactUnlocked: false,
    });
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(view.tone).toBe("warn");
    expect(view.showSimulate).toBe(true);
    expect(
      demoIntentBadgeStatus({
        intentStatus: "SUCCEEDED",
        bookingStatus: "PENDING_PAYMENT",
        contactUnlocked: false,
      }),
    ).toBe("PENDING");
  });

  it("viser ikke suksess for PENDING tillegg på finansiert booking", () => {
    const view = paymentConfirmView({
      bookingStatus: "IN_PROGRESS",
      intentStatus: "PENDING",
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: "APPROVED",
      intentKind: "EXTRA",
    });
    expect(view.title).toMatch(/ikke ferdig/i);
    expect(view.tone).not.toBe("ok");
    expect(view.showSimulate).toBe(true);
    expect(view.body).not.toMatch(/merket som betalt/i);
    expect(
      demoIntentBadgeStatus({
        intentStatus: "PENDING",
        bookingStatus: "IN_PROGRESS",
        contactUnlocked: true,
        extraCharge: true,
        extraChargeStatus: "APPROVED",
      }),
    ).toBe("PENDING");
  });

  it("viser suksess for tillegg først når ExtraCharge er PAID", () => {
    const pendingIntent = paymentConfirmView({
      bookingStatus: "IN_PROGRESS",
      intentStatus: "SUCCEEDED",
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: "APPROVED",
      intentKind: "EXTRA",
    });
    expect(pendingIntent.tone).not.toBe("ok");
    expect(pendingIntent.showSimulate).toBe(true);

    const paid = paymentConfirmView({
      bookingStatus: "IN_PROGRESS",
      intentStatus: "SUCCEEDED",
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: "PAID",
      intentKind: "EXTRA",
    });
    expect(paid.title).toMatch(/tillegget er bekreftet/i);
    expect(paid.tone).toBe("ok");
    expect(paid.showSimulate).toBe(false);
  });

  it("viser feilet og avbrutt tillegg selv om hovedjobben er finansiert", () => {
    const failed = paymentConfirmView({
      bookingStatus: "IN_PROGRESS",
      intentStatus: "FAILED",
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: "APPROVED",
    });
    expect(failed.title).toMatch(/feilet/i);
    expect(failed.tone).toBe("warn");
    expect(failed.showRetry).toBe(true);

    const cancelled = paymentConfirmView({
      bookingStatus: "PAID",
      intentStatus: "CANCELLED",
      contactUnlocked: true,
      extraCharge: true,
      extraChargeStatus: "APPROVED",
    });
    expect(cancelled.title).toMatch(/avbrutt/i);
    expect(cancelled.showRetry).toBe(true);
  });
});
