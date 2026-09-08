import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBookingForViewer } from "@/lib/authz";
import { describeBookingMoney } from "@/lib/booking-totals";
import { errorMessage, errorStatus } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Innlogging kreves." }, { status: 401 });
    }
    const { id } = await params;
    const booking = await getBookingForViewer(db, user, id);
    const extras = await db.extraCharge.findMany({ where: { bookingId: booking.id } });
    const money = describeBookingMoney({
      agreedOre: booking.amountOre,
      extras,
      platformFeeBps: booking.platformFeeBps,
      status: booking.status,
      refundedOre: booking.refundedOre,
    });
    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      amountOre: money.agreedOre,
      extrasPaidOre: money.extrasPaidOre,
      extrasApprovedUnpaidOre: money.extrasApprovedUnpaidOre,
      fundedOre: money.fundedOre,
      remainingToPayOre: money.remainingToPayOre,
      platformFeeOre: money.feeAfterRefundOre,
      providerPayoutOre: money.settlementAfterRefundOre,
      refundedOre: money.refundedOre,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
