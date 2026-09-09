import { sha256 } from "./crypto";

export type EmailSendResult =
  | { sent: true; id: string }
  | { sent: false; reason: "not_configured" | "provider_error" };

const RESET_SUBJECT = "Tilbakestill passordet på Jobbenmin";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** @deprecated Bruk emailConfigured — beholdt for eksisterende reset-tester. */
export function passwordResetEmailConfigured(): boolean {
  return emailConfigured();
}

export function appBaseUrl(): string {
  const explicit =
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resetEmailHtml(resetUrl: string): string {
  return `<p>Du ba om å tilbakestille passordet på Jobbenmin.</p>
<p><a href="${resetUrl}">Velg nytt passord</a>. Lenken gjelder i én time og kan bare brukes én gang.</p>
<p>Hvis du ikke ba om dette, kan du se bort fra e-posten.</p>`;
}

export function resetEmailText(resetUrl: string): string {
  return `Du ba om å tilbakestille passordet på Jobbenmin.\n\nÅpne denne lenken innen én time:\n${resetUrl}\n\nHvis du ikke ba om dette, kan du se bort fra e-posten.`;
}

export function jobAlertEmailSubject(typeLabel: string): string {
  return `Ny jobb i ditt område – ${typeLabel}`;
}

export type JobAlertEmailPayload = {
  typeLabel: string;
  area: string;
  title: string;
  description: string;
  budget: string | null;
  publishedAt: string;
  jobUrl: string;
};

export function jobAlertEmailHtml(payload: JobAlertEmailPayload): string {
  const typeLabel = escapeHtml(payload.typeLabel);
  const area = escapeHtml(payload.area);
  const title = escapeHtml(payload.title);
  const description = escapeHtml(payload.description);
  const budget = payload.budget ? escapeHtml(payload.budget) : null;
  const publishedAt = escapeHtml(payload.publishedAt);
  const jobUrl = escapeHtml(payload.jobUrl);
  return `<!DOCTYPE html>
<html lang="nb">
<body style="margin:0;padding:0;background:#f4f0e6;font-family:Figtree,Arial,sans-serif;color:#1b1914;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#16362d;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;color:#f7f3eb;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d9c4a8;">Jobbenmin</p>
              <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;font-weight:700;">NYTT OPPDRAG SOM PASSER DIN BEDRIFT</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2f6b52;">${typeLabel} · ${area}</p>
                    <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#16362d;">${title}</p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#5c564c;">${description}</p>
                    ${budget ? `<p style="margin:0 0 8px;font-size:14px;color:#1b1914;"><strong>Budsjett:</strong> ${budget}</p>` : ""}
                    <p style="margin:0 0 22px;font-size:14px;color:#5c564c;"><strong>Publisert:</strong> ${publishedAt}</p>
                    <a href="${jobUrl}" style="display:inline-block;background:#c46a32;color:#fffaf3;text-decoration:none;font-weight:700;letter-spacing:0.04em;padding:14px 22px;border-radius:10px;">SE OPPDRAG OG GI TILBUD</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#d9c4a8;">Gateadresse, telefon og e-post til kunden vises først etter bekreftet betaling. Du kan slå av varsler under Konto → Jobbvarsler.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function jobAlertEmailText(payload: JobAlertEmailPayload): string {
  const lines = [
    "NYTT OPPDRAG SOM PASSER DIN BEDRIFT",
    "",
    payload.title,
    `${payload.typeLabel} · ${payload.area}`,
    "",
    payload.description,
  ];
  if (payload.budget) lines.push("", `Budsjett: ${payload.budget}`);
  lines.push("", `Publisert: ${payload.publishedAt}`, "", `Se oppdrag og gi tilbud: ${payload.jobUrl}`);
  return lines.join("\n");
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }
  const fingerprint = sha256(`${input.to}:${input.subject}`).slice(0, 8);
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
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error("transactional-email-failed", fingerprint, response.status);
      return { sent: false, reason: "provider_error" };
    }
    const payload = (await response.json()) as { id?: string };
    return { sent: true, id: payload.id ?? fingerprint };
  } catch {
    console.error("transactional-email-failed", fingerprint);
    return { sent: false, reason: "provider_error" };
  }
}

/** Sender tilbakestilling via Resend. Logger aldri selve lenken eller tokenet. */
export async function sendPasswordResetEmail(input: {
  to: string;
  token: string;
}): Promise<EmailSendResult> {
  if (!emailConfigured()) {
    return { sent: false, reason: "not_configured" };
  }
  const resetUrl = `${appBaseUrl()}/tilbakestill-passord?token=${encodeURIComponent(input.token)}`;
  return sendTransactionalEmail({
    to: input.to,
    subject: RESET_SUBJECT,
    html: resetEmailHtml(resetUrl),
    text: resetEmailText(resetUrl),
  });
}
