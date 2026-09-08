import type { Prisma, PrismaClient } from "@prisma/client";
import { calcCommission } from "./money";
import { summarizeBookingMoney } from "./booking-totals";

export const LEDGER = {
  RESERVATION: "RESERVATION",
  CHARGE: "CHARGE",
  COMMISSION: "COMMISSION",
  EXTRA_CHARGE: "EXTRA_CHARGE",
  EXTRA_COMMISSION: "EXTRA_COMMISSION",
  PAYOUT_ACCRUAL: "PAYOUT_ACCRUAL",
  REFUND: "REFUND",
  COMMISSION_REVERSAL: "COMMISSION_REVERSAL",
  EXPIRED: "EXPIRED",
  DISPUTE_HOLD: "DISPUTE_HOLD",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type LedgerType = (typeof LEDGER)[keyof typeof LEDGER];

type Db = PrismaClient | Prisma.TransactionClient;

export async function postLedger(
  db: Db,
  input: {
    bookingId: string;
    type: LedgerType;
    amountOre: number;
    extraChargeId?: string | null;
    paymentId?: string | null;
    eventId?: string | null;
    note?: string | null;
  },
) {
  if (input.eventId) {
    const existing = await db.settlementEntry.findUnique({ where: { eventId: input.eventId } });
    if (existing) return existing;
  }
  return db.settlementEntry.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      amountOre: input.amountOre,
      extraChargeId: input.extraChargeId ?? null,
      paymentId: input.paymentId ?? null,
      eventId: input.eventId ?? null,
      note: input.note ?? null,
    },
  });
}

export async function hasLedgerEvent(db: Db, eventId: string) {
  return Boolean(await db.settlementEntry.findUnique({ where: { eventId } }));
}

export async function sumLedger(db: Db, bookingId: string, type: LedgerType) {
  const rows = await db.settlementEntry.findMany({ where: { bookingId, type } });
  return rows.reduce((sum, row) => sum + row.amountOre, 0);
}

export async function syncBookingSettlement(
  db: Db,
  booking: { id: string; amountOre: number; platformFeeBps: number; refundedOre?: number },
) {
  const extras = await db.extraCharge.findMany({ where: { bookingId: booking.id } });
  const money = summarizeBookingMoney(booking.amountOre, extras, booking.platformFeeBps, {
    refundedOre: booking.refundedOre,
  });
  return db.booking.update({
    where: { id: booking.id },
    data: {
      platformFeeOre: money.feeAfterRefundOre,
      providerPayoutOre: money.settlementAfterRefundOre,
    },
  });
}

export function commissionOn(amountOre: number, platformFeeBps: number) {
  return calcCommission(amountOre, platformFeeBps);
}

export async function ledgerSnapshot(db: Db, bookingId: string) {
  const entries = await db.settlementEntry.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
  });
  const charged = entries
    .filter((row) => row.type === LEDGER.CHARGE || row.type === LEDGER.EXTRA_CHARGE)
    .reduce((sum, row) => sum + row.amountOre, 0);
  const refunded = entries
    .filter((row) => row.type === LEDGER.REFUND)
    .reduce((sum, row) => sum + row.amountOre, 0);
  const commission = entries
    .filter((row) => row.type === LEDGER.COMMISSION || row.type === LEDGER.EXTRA_COMMISSION)
    .reduce((sum, row) => sum + row.amountOre, 0);
  const commissionReversed = entries
    .filter((row) => row.type === LEDGER.COMMISSION_REVERSAL)
    .reduce((sum, row) => sum + row.amountOre, 0);
  const payoutAccrued = entries
    .filter((row) => row.type === LEDGER.PAYOUT_ACCRUAL)
    .reduce((sum, row) => sum + row.amountOre, 0);
  return {
    entries,
    charged,
    refunded,
    commissionNet: commission - commissionReversed,
    payoutAccrued,
  };
}
