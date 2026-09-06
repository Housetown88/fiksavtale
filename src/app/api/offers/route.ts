import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { assertCanViewOffers } from "@/lib/authz";
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
    const job = await assertCanViewOffers(db, user, jobId);
    const offers = job.customerId === user.id || user.role === "ADMIN"
      ? job.offers
      : job.offers.filter((offer) => offer.providerId === user.id);
    return NextResponse.json(
      offers.map((offer) => ({
        id: offer.id,
        jobId: offer.jobId,
        providerId: offer.providerId,
        amountOre: offer.amountOre,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
      })),
    );
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
