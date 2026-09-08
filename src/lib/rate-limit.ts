import type { PrismaClient } from "@prisma/client";

export async function hitRateLimit(
  db: PrismaClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; count: number }> {
  const since = new Date(Date.now() - windowMs);
  await db.authThrottle.deleteMany({ where: { key, createdAt: { lt: since } } });
  const count = await db.authThrottle.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) {
    return { allowed: false, count };
  }
  await db.authThrottle.create({ data: { key } });
  return { allowed: true, count: count + 1 };
}
