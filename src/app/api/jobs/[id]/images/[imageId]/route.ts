import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getJobForViewer } from "@/lib/authz";
import { errorMessage, errorStatus } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const { id, imageId } = await params;
    const user = await getCurrentUser();
    // Samme regel som oppdragssiden — ikke canViewerSeeContact.
    await getJobForViewer(db, user, id);

    const image = await db.jobImage.findFirst({
      where: { id: imageId, jobId: id },
    });
    if (!image) {
      return NextResponse.json({ error: "Bildet finnes ikke" }, { status: 404 });
    }

    const variant = new URL(request.url).searchParams.get("variant");
    const body = variant === "full" ? image.data : image.thumb;
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(body.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
