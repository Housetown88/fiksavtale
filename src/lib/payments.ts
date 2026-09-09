import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { calcCommission } from "./money";
import { LEDGER, postLedger, syncBookingSettlement } from "./ledger";
import { canUnlockViaDemoPayment } from "./demo-mode";
import { summarizeBookingMoney } from "./booking-totals";

export const DEMO_WEBHOOK_SECRET =
  process.env.DEMO_WEBHOOK_SECRET ?? "jobbenmin-demo-webhook-secret-ikke-for-produksjon";

export const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;

export type WebhookEvent = {
  eventId: string;
  type:
    | "payment.succeeded"
    | "payment.failed"
    | "payment.cancelled"
    | "reservation.expired"
    | "refund.succeeded";
  paymentIntentId: string;
  bookingId: string;
  refundOre?: number;
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

export async function expireStalePaymentIntents(db: PrismaClient | Prisma.TransactionClient, now = new Date()) {
  const stale = await db.paymentIntent.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
  });
  for (const intent of stale) {
    await db.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "EXPIRED" },
    });
    await postLedger(db, {
      bookingId: intent.bookingId,
      type: LEDGER.EXPIRED,
      amountOre: intent.amountOre,
      extraChargeId: intent.extraChargeId,
      eventId: `expired_${intent.id}`,
      note: "Utløpt reservasjon. Ingen trekk, ingen provisjon.",
    });
  }
  return stale.length;
}

export async function createPaymentIntent(
  db: PrismaClient,
  bookingId: string,
  options?: { extraChargeId?: string },
) {
  await expireStalePaymentIntents(db);
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
        kind: "EXTRA",
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
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
      kind: "RESERVATION",
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
    },
  });
}

export type WebhookResult = {
  idempotentReplay: boolean;
  bookingStatus: string;
  contactUnlocked: boolean;
  ignored?: string;
};

export type PaymentWebhookOptions = {
  /**
   * Innlogget «Bekreft DEMO-betaling». Skal finansiere bookingen (PAID + kontakt)
   * også i produksjon, der den eksterne DEMO-webhooken er sperret for ekte kunder.
   */
  applyFinance?: boolean;
};

function isReservationIntent(intent: { extraChargeId: string | null; kind: string }) {
  return !intent.extraChargeId && intent.kind !== "EXTRA" && intent.kind !== "REFUND";
}

function isExtraIntent(intent: { extraChargeId: string | null; kind: string }) {
  return Boolean(intent.extraChargeId) || intent.kind === "EXTRA";
}

/**
 * Invariant: en lykkes reservasjonsintensjon SKAL sette booking PAID + contactUnlockedAt.
 * Brukes av DEMO-bekreftelse, webhook og reparasjon av fastlåste rader.
 */
async function financeSucceededReservationInTx(
  tx: Prisma.TransactionClient,
  input: {
    booking: {
      id: string;
      jobId: string;
      amountOre: number;
      platformFeeBps: number;
      status: string;
      contactUnlockedAt: Date | null;
    };
    intent: { id: string; amountOre: number; extraChargeId: string | null; kind: string };
    paymentId?: string | null;
  },
) {
  if (!isReservationIntent(input.intent)) {
    throw new Error("Bare reservasjonsintensjon kan finansiere hovedbookingen");
  }
  if (input.booking.status !== "PENDING_PAYMENT") {
    return;
  }

  const fee = calcCommission(input.intent.amountOre, input.booking.platformFeeBps);
  const existingCharge = await tx.settlementEntry.findFirst({
    where: { bookingId: input.booking.id, type: LEDGER.CHARGE, extraChargeId: null },
  });
  if (!existingCharge) {
    await postLedger(tx, {
      bookingId: input.booking.id,
      type: LEDGER.CHARGE,
      amountOre: input.intent.amountOre,
      paymentId: input.paymentId,
      eventId: `charge_reservation_${input.intent.id}`,
    });
    await postLedger(tx, {
      bookingId: input.booking.id,
      type: LEDGER.COMMISSION,
      amountOre: fee.platformFeeOre,
      paymentId: input.paymentId,
      eventId: `fee_reservation_${input.intent.id}`,
      note: "Provisjon trukket automatisk ved finansiering.",
    });
  }

  await tx.booking.update({
    where: { id: input.booking.id },
    data: {
      status: "PAID",
      contactUnlockedAt: input.booking.contactUnlockedAt ?? new Date(),
      approvalDeadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      platformFeeOre: fee.platformFeeOre,
      providerPayoutOre: fee.providerPayoutOre,
    },
  });
  await tx.job.update({
    where: { id: input.booking.jobId },
    data: { status: "BOOKED" },
  });
}

/**
 * Invariant: en lykkes tilleggsintensjon SKAL sette ExtraCharge PAID + EXTRA_CHARGE/EXTRA_COMMISSION.
 * Brukes av DEMO-bekreftelse, webhook og reparasjon av fastlåste tillegg.
 */
async function financeSucceededExtraInTx(
  tx: Prisma.TransactionClient,
  input: {
    booking: {
      id: string;
      amountOre: number;
      platformFeeBps: number;
      refundedOre?: number;
    };
    intent: { id: string; amountOre: number; extraChargeId: string | null; kind: string };
    paymentId?: string | null;
  },
) {
  if (!isExtraIntent(input.intent) || !input.intent.extraChargeId) {
    throw new Error("Bare tilleggsintensjon kan finansiere tillegg");
  }
  const extra = await tx.extraCharge.findUnique({ where: { id: input.intent.extraChargeId } });
  if (!extra || extra.bookingId !== input.booking.id) {
    throw new Error("Tillegget finnes ikke på denne bookingen");
  }
  if (extra.status === "PAID") {
    await syncBookingSettlement(tx, input.booking);
    return;
  }
  if (extra.status !== "APPROVED") {
    return;
  }

  await tx.extraCharge.update({
    where: { id: extra.id },
    data: { status: "PAID" },
  });
  const fee = calcCommission(input.intent.amountOre, input.booking.platformFeeBps);
  const existingCharge = await tx.settlementEntry.findFirst({
    where: {
      bookingId: input.booking.id,
      type: LEDGER.EXTRA_CHARGE,
      extraChargeId: extra.id,
    },
  });
  if (!existingCharge) {
    await postLedger(tx, {
      bookingId: input.booking.id,
      type: LEDGER.EXTRA_CHARGE,
      amountOre: input.intent.amountOre,
      extraChargeId: extra.id,
      paymentId: input.paymentId,
      eventId: `charge_extra_${input.intent.id}`,
    });
    await postLedger(tx, {
      bookingId: input.booking.id,
      type: LEDGER.EXTRA_COMMISSION,
      amountOre: fee.platformFeeOre,
      extraChargeId: extra.id,
      paymentId: input.paymentId,
      eventId: `fee_extra_${input.intent.id}`,
      note: "Provisjon trukket automatisk ved finansiering av tillegg.",
    });
  }
  await syncBookingSettlement(tx, input.booking);
}

/** Finansier godkjent tillegg fra en allerede (eller nå) lykkes EXTRA-intensjon. */
export async function applySucceededExtraFinance(
  db: PrismaClient,
  bookingId: string,
  paymentIntentId: string,
): Promise<WebhookResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  const intent = await db.paymentIntent.findUnique({ where: { id: paymentIntentId } });
  if (!booking || !intent || intent.bookingId !== booking.id) {
    throw new Error("Ugyldig booking eller betalingsintensjon");
  }
  if (!isExtraIntent(intent) || !intent.extraChargeId) {
    throw new Error("Bare tilleggsintensjon kan finansiere tillegg");
  }

  await db.$transaction(async (tx) => {
    if (intent.status !== "SUCCEEDED") {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "SUCCEEDED" },
      });
    }
    let payment = await tx.payment.findFirst({
      where: { paymentIntentId: intent.id, status: "SUCCEEDED" },
    });
    if (!payment) {
      payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: intent.id,
          eventId: `repair_extra_${intent.id}`,
          amountOre: intent.amountOre,
          status: "SUCCEEDED",
          rawPayload: JSON.stringify({ repaired: true, paymentIntentId: intent.id, kind: "EXTRA" }),
        },
      });
    }
    await financeSucceededExtraInTx(tx, {
      booking,
      intent,
      paymentId: payment.id,
    });
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return {
    idempotentReplay: false,
    bookingStatus: updated.status,
    contactUnlocked: Boolean(updated.contactUnlockedAt),
  };
}

/** Finansier booking fra en allerede (eller nå) lykkes reservasjonsintensjon. */
export async function applySucceededReservationFinance(
  db: PrismaClient,
  bookingId: string,
  paymentIntentId: string,
): Promise<WebhookResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  const intent = await db.paymentIntent.findUnique({ where: { id: paymentIntentId } });
  if (!booking || !intent || intent.bookingId !== booking.id) {
    throw new Error("Ugyldig booking eller betalingsintensjon");
  }
  if (!isReservationIntent(intent)) {
    throw new Error("Bare reservasjonsintensjon kan finansiere hovedbookingen");
  }

  await db.$transaction(async (tx) => {
    if (intent.status !== "SUCCEEDED") {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "SUCCEEDED" },
      });
    }
    let payment = await tx.payment.findFirst({
      where: { paymentIntentId: intent.id, status: "SUCCEEDED" },
    });
    if (!payment) {
      payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: intent.id,
          eventId: `repair_reservation_${intent.id}`,
          amountOre: intent.amountOre,
          status: "SUCCEEDED",
          rawPayload: JSON.stringify({ repaired: true, paymentIntentId: intent.id }),
        },
      });
    }
    await financeSucceededReservationInTx(tx, {
      booking,
      intent,
      paymentId: payment.id,
    });
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return {
    idempotentReplay: false,
    bookingStatus: updated.status,
    contactUnlocked: Boolean(updated.contactUnlockedAt),
  };
}

/**
 * Reparerer fastlåste DEMO-rader: reservasjonsintensjon SUCCEEDED, booking fortsatt PENDING_PAYMENT.
 * Treffer alle slike rader — ikke én produksjons-id. Trygg å kjøre flere ganger (ingen dobbel provisjon).
 */
export async function repairUnfinancedSucceededReservations(db: PrismaClient) {
  const intents = await db.paymentIntent.findMany({
    where: {
      status: "SUCCEEDED",
      extraChargeId: null,
      kind: "RESERVATION",
    },
  });
  const repaired: string[] = [];
  for (const intent of intents) {
    const booking = await db.booking.findUnique({ where: { id: intent.bookingId } });
    if (!booking || booking.status !== "PENDING_PAYMENT") continue;
    await applySucceededReservationFinance(db, booking.id, intent.id);
    repaired.push(booking.id);
  }
  return { repairedCount: repaired.length, bookingIds: repaired };
}

/**
 * Reparerer tillegg der EXTRA-intensjonen allerede er SUCCEEDED, men ExtraCharge fortsatt APPROVED.
 * PENDING-intensjoner auto-betales ikke — kunden bekrefter på bekreftelsessiden.
 */
export async function repairUnpaidApprovedExtras(db: PrismaClient) {
  const extras = await db.extraCharge.findMany({ where: { status: "APPROVED" } });
  const repaired: string[] = [];
  for (const extra of extras) {
    const intent = await db.paymentIntent.findFirst({
      where: { extraChargeId: extra.id, kind: "EXTRA", status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    });
    if (!intent) continue;
    await applySucceededExtraFinance(db, extra.bookingId, intent.id);
    repaired.push(extra.id);
  }
  return { repairedCount: repaired.length, extraChargeIds: repaired };
}

/** Kundens DEMO-bekreftelse — aldri bare merke intensjon uten booking- eller tilleggseffekt. */
export async function confirmDemoPayment(
  db: PrismaClient,
  event: WebhookEvent,
): Promise<WebhookResult> {
  if (event.type === "payment.succeeded") {
    const intent = await db.paymentIntent.findUnique({ where: { id: event.paymentIntentId } });
    if (intent && intent.bookingId === event.bookingId) {
      if (isReservationIntent(intent) && intent.status === "SUCCEEDED") {
        return applySucceededReservationFinance(db, event.bookingId, intent.id);
      }
      if (isExtraIntent(intent)) {
        return applySucceededExtraFinance(db, event.bookingId, intent.id);
      }
    }
  }
  return handlePaymentWebhook(db, event, { applyFinance: true });
}

export async function handlePaymentWebhook(
  db: PrismaClient,
  event: WebhookEvent,
  options?: PaymentWebhookOptions,
): Promise<WebhookResult> {
  const existing = await db.payment.findUnique({
    where: { eventId: event.eventId },
  });
  if (existing) {
    const booking = await db.booking.findUniqueOrThrow({
      where: { id: existing.bookingId },
    });
    if (existing.status === "SUCCEEDED") {
      const existingIntent = await db.paymentIntent.findUnique({
        where: { id: existing.paymentIntentId },
      });
      if (
        existingIntent &&
        isReservationIntent(existingIntent) &&
        booking.status === "PENDING_PAYMENT"
      ) {
        return applySucceededReservationFinance(db, booking.id, existingIntent.id);
      }
      if (existingIntent && isExtraIntent(existingIntent) && existingIntent.extraChargeId) {
        const extra = await db.extraCharge.findUnique({
          where: { id: existingIntent.extraChargeId },
        });
        if (extra && extra.status === "APPROVED") {
          return applySucceededExtraFinance(db, booking.id, existingIntent.id);
        }
      }
    }
    return {
      idempotentReplay: true,
      bookingStatus: booking.status,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
    };
  }

  const booking = await db.booking.findUnique({
    where: { id: event.bookingId },
    include: {
      payments: true,
      extras: true,
      customer: true,
    },
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

  if (event.type === "reservation.expired") {
    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          paymentIntentId: intent.id,
          eventId: event.eventId,
          amountOre: intent.amountOre,
          status: "EXPIRED",
          rawPayload: JSON.stringify(event),
        },
      });
      if (intent.status === "PENDING") {
        await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } });
      }
      await postLedger(tx, {
        bookingId: booking.id,
        type: LEDGER.EXPIRED,
        amountOre: intent.amountOre,
        extraChargeId: intent.extraChargeId,
        eventId: `ledger_${event.eventId}`,
      });
    });
    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    return {
      idempotentReplay: false,
      bookingStatus: updated.status,
      contactUnlocked: Boolean(updated.contactUnlockedAt),
    };
  }

  if (event.type === "refund.succeeded") {
    return applyRefundEvent(db, booking, intent, event);
  }

  const paymentStatus =
    event.type === "payment.succeeded"
      ? "SUCCEEDED"
      : event.type === "payment.cancelled"
        ? "CANCELLED"
        : "FAILED";

  if (intent.status === "EXPIRED" && paymentStatus === "SUCCEEDED") {
    await db.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        eventId: event.eventId,
        amountOre: intent.amountOre,
        status: "FAILED",
        rawPayload: JSON.stringify({ ...event, ignored: "expired_intent" }),
      },
    });
    return {
      idempotentReplay: false,
      bookingStatus: booking.status,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
      ignored: "expired_intent",
    };
  }

  const alreadyPaid = booking.status !== "PENDING_PAYMENT" && booking.payments.some((p) => p.status === "SUCCEEDED");
  const extraAlreadyPaid =
    intent.extraChargeId && booking.extras.some((extra) => extra.id === intent.extraChargeId && extra.status === "PAID");

  const mayUnlock = Boolean(options?.applyFinance) || canUnlockViaDemoPayment(booking.customer.email);

  // Ingen falsk suksess: ekstern DEMO-webhook i prod skal ikke merke intensjon som
  // SUCCEEDED uten å finansiere bookingen. Innlogget bekreftelse bruker applyFinance.
  if (paymentStatus === "SUCCEEDED" && isReservationIntent(intent) && !mayUnlock) {
    return {
      idempotentReplay: false,
      bookingStatus: booking.status,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
      ignored: "prod_demo_blocked",
    };
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: event.paymentIntentId,
        eventId: event.eventId,
        amountOre: intent.amountOre,
        status: paymentStatus,
        rawPayload: JSON.stringify(event),
      },
    });

    if (intent.status === "PENDING" || (paymentStatus === "SUCCEEDED" && intent.status !== "SUCCEEDED")) {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: paymentStatus },
      });
    }

    if (paymentStatus === "FAILED") {
      await postLedger(tx, {
        bookingId: booking.id,
        type: LEDGER.FAILED,
        amountOre: intent.amountOre,
        extraChargeId: intent.extraChargeId,
        paymentId: payment.id,
        eventId: `ledger_${event.eventId}`,
        note: "Betaling feilet. Ingen provisjon.",
      });
      return;
    }
    if (paymentStatus === "CANCELLED") {
      await postLedger(tx, {
        bookingId: booking.id,
        type: LEDGER.CANCELLED,
        amountOre: intent.amountOre,
        extraChargeId: intent.extraChargeId,
        paymentId: payment.id,
        eventId: `ledger_${event.eventId}`,
        note: "Betaling avbrutt. Ingen provisjon.",
      });
      return;
    }

    if (isExtraIntent(intent)) {
      if (extraAlreadyPaid) return;
      await financeSucceededExtraInTx(tx, {
        booking,
        intent,
        paymentId: payment.id,
      });
      return;
    }

    if (alreadyPaid) {
      return;
    }

    await financeSucceededReservationInTx(tx, {
      booking,
      intent,
      paymentId: payment.id,
    });
  });

  const updated = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });

  return {
    idempotentReplay: false,
    bookingStatus: updated.status,
    contactUnlocked: Boolean(updated.contactUnlockedAt),
    ignored: !mayUnlock && event.type === "payment.succeeded" && isReservationIntent(intent) ? "prod_demo_blocked" : undefined,
  };
}

async function applyRefundEvent(
  db: PrismaClient,
  booking: {
    id: string;
    amountOre: number;
    platformFeeBps: number;
    refundedOre: number;
    extras: { amountOre: number; status: string }[];
  },
  intent: { id: string; amountOre: number },
  event: WebhookEvent,
): Promise<WebhookResult> {
  const money = summarizeBookingMoney(booking.amountOre, booking.extras, booking.platformFeeBps, {
    refundedOre: booking.refundedOre,
  });
  const refundOre = Math.min(event.refundOre ?? intent.amountOre, Math.max(0, money.fundedOre - booking.refundedOre));
  if (refundOre <= 0) {
    return {
      idempotentReplay: false,
      bookingStatus: (await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status,
      contactUnlocked: false,
      ignored: "nothing_to_refund",
    };
  }
  const previousFee = calcCommission(money.fundedOre - booking.refundedOre, booking.platformFeeBps).platformFeeOre;
  const nextFee = calcCommission(money.fundedOre - booking.refundedOre - refundOre, booking.platformFeeBps).platformFeeOre;
  const feeReversal = Math.max(0, previousFee - nextFee);

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        paymentIntentId: intent.id,
        eventId: event.eventId,
        amountOre: refundOre,
        status: "SUCCEEDED",
        rawPayload: JSON.stringify(event),
      },
    });
    await postLedger(tx, {
      bookingId: booking.id,
      type: LEDGER.REFUND,
      amountOre: refundOre,
      eventId: `refund_${event.eventId}`,
    });
    if (feeReversal > 0) {
      await postLedger(tx, {
        bookingId: booking.id,
        type: LEDGER.COMMISSION_REVERSAL,
        amountOre: feeReversal,
        eventId: `fee_rev_${event.eventId}`,
        note: "Provisjon justert ved refusjon.",
      });
    }
    const nextRefunded = booking.refundedOre + refundOre;
    const fullyRefunded = nextRefunded >= money.fundedOre;
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        refundedOre: nextRefunded,
        ...(fullyRefunded ? { status: "REFUNDED" as const } : {}),
        platformFeeOre: nextFee,
        providerPayoutOre: calcCommission(money.fundedOre - nextRefunded, booking.platformFeeBps).providerPayoutOre,
      },
    });
  });
  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return {
    idempotentReplay: false,
    bookingStatus: updated.status,
    contactUnlocked: Boolean(updated.contactUnlockedAt),
  };
}

export async function refundBooking(
  db: PrismaClient,
  bookingId: string,
  refundOre: number,
  eventId: string,
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { extras: true, payments: true },
  });
  if (!booking) throw new Error("Bookingen finnes ikke");
  const intent =
    (await db.paymentIntent.findFirst({
      where: { bookingId, extraChargeId: null, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
    })) ??
    (await db.paymentIntent.create({
      data: {
        bookingId,
        amountOre: refundOre,
        status: "PENDING",
        kind: "REFUND",
      },
    }));
  return handlePaymentWebhook(db, {
    eventId,
    type: "refund.succeeded",
    paymentIntentId: intent.id,
    bookingId,
    refundOre,
  });
}

export function quoteOffer(amountOre: number, platformFeeBps: number) {
  return {
    amountOre,
    ...calcCommission(amountOre, platformFeeBps),
  };
}
