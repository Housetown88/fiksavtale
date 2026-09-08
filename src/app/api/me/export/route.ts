import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createDataRequest, exportUserData } from "@/lib/privacy";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Innlogging kreves." }, { status: 401 });
  }
  await createDataRequest(db, user, { type: "EXPORT" });
  const payload = await exportUserData(db, user);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobbenmin-eksport.json"',
    },
  });
}
