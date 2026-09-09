import type { PrismaClient } from "@prisma/client";
import { AuthzError, type Viewer } from "./authz";

export const DATA_REQUEST_TYPES = ["ACCESS", "EXPORT", "DELETION"] as const;
export type DataRequestType = (typeof DATA_REQUEST_TYPES)[number];

export async function createDataRequest(
  db: PrismaClient,
  viewer: Viewer,
  input: { type: DataRequestType; message?: string },
) {
  if (!DATA_REQUEST_TYPES.includes(input.type)) {
    throw new Error("Ugyldig type forespørsel.");
  }
  const open = await db.dataRequest.findFirst({
    where: { userId: viewer.id, type: input.type, status: "OPEN" },
  });
  if (open) return open;
  return db.dataRequest.create({
    data: {
      userId: viewer.id,
      type: input.type,
      message: input.message?.trim() || null,
    },
  });
}

export async function exportUserData(db: PrismaClient, viewer: Viewer) {
  const user = await db.user.findUnique({
    where: { id: viewer.id },
    include: {
      customerProfile: true,
      providerProfile: true,
      jobAlertPreference: true,
      jobs: { select: { id: true, title: true, category: true, area: true, status: true, createdAt: true } },
      bookingsAsCustomer: {
        select: {
          id: true,
          amountOre: true,
          platformFeeOre: true,
          providerPayoutOre: true,
          status: true,
          refundedOre: true,
          createdAt: true,
        },
      },
      bookingsAsProvider: {
        select: {
          id: true,
          amountOre: true,
          platformFeeOre: true,
          providerPayoutOre: true,
          status: true,
          refundedOre: true,
          createdAt: true,
        },
      },
      reportsFiled: { select: { id: true, reason: true, status: true, createdAt: true } },
    },
  });
  if (!user) throw new AuthzError("Brukeren finnes ikke", 404);
  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    },
    customerProfile: user.customerProfile,
    providerProfile: user.providerProfile
      ? {
          companyName: user.providerProfile.companyName,
          orgNumber: user.providerProfile.orgNumber,
          orgVerified: user.providerProfile.orgVerified,
          orgRegisterStatus: user.providerProfile.orgRegisterStatus,
          orgRegisterName: user.providerProfile.orgRegisterName,
          orgRepConfirmed: user.providerProfile.orgRepConfirmed,
          tradeAuthChecked: user.providerProfile.tradeAuthChecked,
          about: user.providerProfile.about,
          serviceAreas: user.providerProfile.serviceAreas,
        }
      : null,
    jobAlertPreference: user.jobAlertPreference
      ? {
          categories: user.jobAlertPreference.categories,
          areas: user.jobAlertPreference.areas,
          radiusKm: user.jobAlertPreference.radiusKm,
          emailEnabled: user.jobAlertPreference.emailEnabled,
          paused: user.jobAlertPreference.paused,
          updatedAt: user.jobAlertPreference.updatedAt,
        }
      : null,
    jobs: user.jobs,
    bookingsAsCustomer: user.bookingsAsCustomer,
    bookingsAsProvider: user.bookingsAsProvider,
    reportsFiled: user.reportsFiled,
    retainedOnDeletion:
      "Regnskaps- og tvistopplysninger (beløp, gebyr, oppgjørsbok, betalingsstatus) beholdes selv om kontoen anonymiseres.",
  };
}

export async function anonymizeUser(db: PrismaClient, actor: Viewer, userId: string) {
  if (actor.role !== "ADMIN" && actor.id !== userId) {
    throw new AuthzError("Ikke tillatt", 403);
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { jobs: true, customerProfile: true, providerProfile: true },
  });
  if (!user) throw new AuthzError("Brukeren finnes ikke", 404);
  if (user.deletedAt) return user;

  const openDispute = await db.booking.findFirst({
    where: {
      OR: [{ customerId: userId }, { providerId: userId }],
      status: "DISPUTED",
    },
  });

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.jobAlertDelivery.deleteMany({ where: { providerId: userId } });
    await tx.jobAlertPreference.deleteMany({ where: { userId } });
    await tx.jobImage.deleteMany({ where: { job: { customerId: userId } } });
    await tx.message.updateMany({
      where: { senderId: userId },
      data: { body: "[slettet etter forespørsel]" },
    });
    if (user.customerProfile) {
      await tx.customerProfile.update({
        where: { userId },
        data: { addressLine: null, postalCode: null, city: null, area: null },
      });
    }
    if (user.providerProfile) {
      await tx.providerProfile.update({
        where: { userId },
        data: {
          about: null,
          invoiceEmail: null,
          serviceAreas: null,
        },
      });
    }
    for (const job of user.jobs) {
      await tx.job.update({
        where: { id: job.id },
        data: { addressLine: null, description: "[slettet etter forespørsel]" },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Slettet bruker",
        email: `slettet-${userId}@anonymisert.invalid`,
        phone: null,
        passwordHash: "deleted",
        deletedAt: new Date(),
      },
    });
  });

  return {
    anonymized: true,
    disputeOpen: Boolean(openDispute),
    retained:
      "Beløp, provisjon, oppgjørsbok og tviststatus er beholdt for regnskap og eventuelle tvister.",
  };
}

export async function resolveDataRequest(
  db: PrismaClient,
  actor: Viewer,
  requestId: string,
  input: { status: "COMPLETED" | "REJECTED"; adminNote?: string },
) {
  if (actor.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const request = await db.dataRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AuthzError("Forespørselen finnes ikke", 404);
  if (input.status === "COMPLETED" && request.type === "DELETION") {
    await anonymizeUser(db, actor, request.userId);
  }
  return db.dataRequest.update({
    where: { id: requestId },
    data: {
      status: input.status,
      adminNote: input.adminNote?.trim() || null,
      resolvedAt: new Date(),
    },
  });
}
