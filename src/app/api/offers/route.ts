import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { assertCanViewOffers, serializeOffersForClient } from "@/lib/offer-access";
import { errorMessage, errorStatus } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Innlogging kreves." }, { status: 401 });
    }
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId mangler" }, { status: 400 });
    }
    const listed = await assertCanViewOffers(db, user, jobId);
    return NextResponse.json({
      offerCount: listed.offerCount,
      offers: serializeOffersForClient(listed.offers),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
