import type { PrismaClient } from "@prisma/client";

export async function writeAuditLog(
  db: PrismaClient,
  input: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: string;
  },
) {
  return db.auditLog.create({ data: input });
}
