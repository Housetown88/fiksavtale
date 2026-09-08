import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEmailHtml, sendPasswordResetEmail } from "../email";

const keys = ["RESEND_API_KEY", "EMAIL_FROM", "APP_BASE_URL"] as const;
const snapshot = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (snapshot[key] == null) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
  vi.unstubAllGlobals();
});

describe("reset-e-post", () => {
  it("sender ikke og avslører ikke token når nøkkel mangler", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const result = await sendPasswordResetEmail({ to: "kari@test.no", token: "hemmelig-token-xyz" });
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.reason).toBe("not_configured");
  });

  it("bygger HTML uten å legge token i synlig tekst utenom lenken", () => {
    const html = resetEmailHtml("https://eksempel.no/tilbakestill-passord?token=abc");
    expect(html).toContain("tilbakestill-passord");
    expect(html).not.toContain("webhook");
  });

  it("kaller Resend når nøkkel er satt og logger ikke token", async () => {
    process.env.RESEND_API_KEY = "re_test_dummy";
    process.env.EMAIL_FROM = "Jobbenmin <test@example.com>";
    process.env.APP_BASE_URL = "https://eksempel.no";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendPasswordResetEmail({ to: "kari@test.no", token: "hemmelig-token-xyz" });
    expect(result.sent).toBe(true);
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain("hemmelig-token-xyz");
    expect(body).not.toContain("webhook");
  });
});
