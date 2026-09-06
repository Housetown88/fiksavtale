import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getBookingForViewer } from "@/lib/authz";
import { errorMessage, errorStatus } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Innlogging kreves." }, { status: 401 });
    }
    const { id } = await params;
    const booking = await getBookingForViewer(db, user, id);
    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      amountOre: booking.amountOre,
      platformFeeOre: booking.platformFeeOre,
      providerPayoutOre: booking.providerPayoutOre,
      contactUnlocked: Boolean(booking.contactUnlockedAt),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
