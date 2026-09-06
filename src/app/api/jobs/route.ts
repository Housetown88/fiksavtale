import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPublicJob } from "@/lib/contact";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const area = searchParams.get("area")?.trim();

  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      category: category || undefined,
      area: area ? { contains: area } : undefined,
      OR: q
        ? [
            { title: { contains: q } },
            { description: { contains: q } },
            { area: { contains: q } },
          ]
        : undefined,
    },
    include: { customer: { include: { customerProfile: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs.map(toPublicJob));
}
