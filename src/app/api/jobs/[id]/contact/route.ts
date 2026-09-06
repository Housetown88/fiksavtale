import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getContactPayload } from "@/lib/contact";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ unlocked: false, reason: "Innlogging kreves." }, { status: 401 });
  }
  const { id } = await params;
  const payload = await getContactPayload(db, { viewerId: user.id, jobId: id });
  if (!payload.unlocked) {
    return NextResponse.json(payload, { status: 403 });
  }
  return NextResponse.json(payload);
}
