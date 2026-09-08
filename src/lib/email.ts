import { sha256 } from "./crypto";

export type EmailSendResult =
  | { sent: true; id: string }
  | { sent: false; reason: "not_configured" | "provider_error" };

const RESET_SUBJECT = "Tilbakestill passordet på Jobbenmin";

export function passwordResetEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  );
}

export function resetEmailHtml(resetUrl: string): string {
  return `<p>Du ba om å tilbakestille passordet på Jobbenmin.</p>
<p><a href="${resetUrl}">Velg nytt passord</a>. Lenken gjelder i én time og kan bare brukes én gang.</p>
<p>Hvis du ikke ba om dette, kan du se bort fra e-posten.</p>`;
}

export function resetEmailText(resetUrl: string): string {
  return `Du ba om å tilbakestille passordet på Jobbenmin.\n\nÅpne denne lenken innen én time:\n${resetUrl}\n\nHvis du ikke ba om dette, kan du se bort fra e-posten.`;
}

/** Sender tilbakestilling via Resend. Logger aldri selve lenken eller tokenet. */
export async function sendPasswordResetEmail(input: {
  to: string;
  token: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }
  const resetUrl = `${appBaseUrl().replace(/\/$/, "")}/tilbakestill-passord?token=${encodeURIComponent(input.token)}`;
  const fingerprint = sha256(`${input.to}:${resetUrl}`).slice(0, 8);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: RESET_SUBJECT,
        html: resetEmailHtml(resetUrl),
        text: resetEmailText(resetUrl),
      }),
    });
    if (!response.ok) {
      console.error("password-reset-email-failed", fingerprint, response.status);
      return { sent: false, reason: "provider_error" };
    }
    const payload = (await response.json()) as { id?: string };
    return { sent: true, id: payload.id ?? fingerprint };
  } catch {
    console.error("password-reset-email-failed", fingerprint);
    return { sent: false, reason: "provider_error" };
  }
}
