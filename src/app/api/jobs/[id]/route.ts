import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getJobForViewer } from "@/lib/authz";
import { toPublicJob } from "@/lib/contact";
import { errorMessage, errorStatus } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const job = await getJobForViewer(db, user, id);
    return NextResponse.json({
      ...toPublicJob({
        ...job,
        customer: {
          id: job.customer.id,
          name: job.customer.name,
          customerProfile: job.customer.customerProfile,
        },
      }),
      offerCount: job._count.offers,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
