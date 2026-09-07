import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { calcCommission } from "./money";

export const DEMO_WEBHOOK_SECRET =
  process.env.DEMO_WEBHOOK_SECRET ?? "jobbenmin-demo-webhook-secret-ikke-for-produksjon";

export type WebhookEvent = {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "payment.cancelled";
  paymentIntentId: string;
  bookingId: string;
};

export function signWebhookPayload(rawBody: string, secret = DEMO_WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = DEMO_WEBHOOK_SECRET): boolean {
  if (!signature) return false;
  const expected = signWebhookPayload(rawBody, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createPaymentIntent(
  db: PrismaClient,
  bookingId: string,
  options?: { extraChargeId?: string },
) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new Error("Bookingen finnes ikke");
  }

  if (options?.extraChargeId) {
    const extra = await db.extraCharge.findUnique({ where: { id: options.extraChargeId } });
    if (!extra || extra.bookingId !== booking.id) {
      throw new Error("Tillegget finnes ikke på denne bookingen");
    }
    if (extra.status !== "APPROVED") {
      throw new Error("Bare godkjente tillegg kan betales.");
    }
    if (!["PAID", "IN_PROGRESS"].includes(booking.status)) {
      throw new Error("Tillegg kan betales først etter at hovedjobben er bekreftet.");
    }
    return db.paymentIntent.create({
      data: {
        bookingId: booking.id,
        extraChargeId: extra.id,
        amountOre: extra.amountOre,
        status: "PENDING",
      },
    });
  }

  if (booking.status !== "PENDING_PAYMENT") {
    throw new Error("Bookingen kan ikke betales i denne tilstanden");
  }
  return db.paymentIntent.create({
    data: {
      bookingId: booking.id,
      amountOre: booking.amountOre,
      status: "PENDING",
    },
  });
}

export type WebhookResult = {
  idempotentReplay: boolean;
  bookingStatus: string;
  contactUnlocked: boolean;
};

export async function handlePaymentWebhook(
  db: PrismaClient,
  event: WebhookEvent,
): Promise<WebhookResult> {
  const existing = await db.payment.findUnique({
    where: { eventId: event.eventId },
  });
  if (existing) {
    const booking = await db.booking.findUniqueOrThrow({
      where: { id: existing.bookingId },
    });
    return {
      idempotentReplay: true,
      bookingStatus: booking.status,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
    };
  }

  const booking = await db.booking.findUnique({
    where: { id: event.bookingId },
    include: { payments: true },
  });
  if (!booking) {
    throw new Error("Bookingen finnes ikke");
  }

  const intent = await db.paymentIntent.findUnique({
    where: { id: event.paymentIntentId },
  });
  if (!intent || intent.bookingId !== booking.id) {
    throw new Error("Ugyldig betalingsintensjon");
  }

  const paymentStatus =
    event.type === "payment.succeeded"
      ? "SUCCEEDED"
      : event.type === "payment.cancelled"
        ? "CANCELLED"
        : "FAILED";

  const alreadyPaid = booking.status !== "PENDING_PAYMENT" && booking.payments.some((p) => p.status === "SUCCEEDED");

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: event.paymentIntentId,
        eventId: event.eventId,
        amountOre: intent.amountOre,
        status: paymentStatus,
        rawPayload: JSON.stringify(event),
      },
    });

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: paymentStatus },
    });

    if (intent.extraChargeId) {
      if (paymentStatus === "SUCCEEDED") {
        await tx.extraCharge.update({
          where: { id: intent.extraChargeId },
          data: { status: "PAID" },
        });
      }
    } else if (paymentStatus === "SUCCEEDED" && !alreadyPaid) {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "PAID",
          contactUnlockedAt: new Date(),
        },
      });
      await tx.job.update({
        where: { id: booking.jobId },
        data: { status: "BOOKED" },
      });
    }
  });

  const updated = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });

  return {
    idempotentReplay: false,
    bookingStatus: updated.status,
    contactUnlocked: Boolean(updated.contactUnlockedAt),
  };
}

export function quoteOffer(amountOre: number, platformFeeBps: number) {
  return {
    amountOre,
    ...calcCommission(amountOre, platformFeeBps),
  };
}
