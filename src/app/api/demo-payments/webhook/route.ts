import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handlePaymentWebhook, verifyWebhookSignature, type WebhookEvent } from "@/lib/payments";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-demo-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Ugyldig DEMO-signatur" }, { status: 401 });
  }
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }
  if (!event.eventId || !event.paymentIntentId || !event.bookingId || !event.type) {
    return NextResponse.json({ error: "Mangler felter" }, { status: 400 });
  }
  try {
    const result = await handlePaymentWebhook(db, event);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook feilet" },
      { status: 400 },
    );
  }
}
