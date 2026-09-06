import type { PrismaClient } from "@prisma/client";
import { DEFAULT_PLATFORM_FEE_BPS } from "./money";

export async function getPlatformFeeBps(db: PrismaClient): Promise<number> {
  const settings = await db.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      platformFeeBps: Number(process.env.PLATFORM_FEE_BPS ?? DEFAULT_PLATFORM_FEE_BPS),
    },
  });
  return settings.platformFeeBps;
}
