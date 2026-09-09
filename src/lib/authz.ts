import type { PrismaClient, Role } from "@prisma/client";

export class AuthzError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export type Viewer = { id: string; role: Role };

export async function getJobForViewer(
  db: PrismaClient,
  viewer: Viewer | null,
  jobId: string,
) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      customer: { include: { customerProfile: true } },
      booking: true,
      _count: { select: { offers: true } },
    },
  });
  if (!job) {
    throw new AuthzError("Oppdraget finnes ikke", 404);
  }

  const isOwner = viewer?.id === job.customerId;
  const isAdmin = viewer?.role === "ADMIN";

  if (job.status !== "OPEN" && !isOwner && !isAdmin) {
    const involvedProvider = viewer
      ? job.booking?.providerId === viewer.id ||
        Boolean(
          await db.offer.findFirst({
            where: { jobId: job.id, providerId: viewer.id },
            select: { id: true },
          }),
        )
      : false;
    if (!involvedProvider) {
      throw new AuthzError("Du har ikke tilgang til dette oppdraget", 403);
    }
  }

  return job;
}

export async function getOfferForViewer(
  db: PrismaClient,
  viewer: Viewer,
  offerId: string,
) {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { job: true },
  });
  if (!offer) throw new AuthzError("Tilbudet finnes ikke", 404);
  if (
    viewer.role !== "ADMIN" &&
    viewer.id !== offer.providerId &&
    viewer.id !== offer.job.customerId
  ) {
    throw new AuthzError("Du har ikke tilgang til dette tilbudet", 403);
  }
  return offer;
}

export async function getConversationForViewer(
  db: PrismaClient,
  viewer: Viewer,
  conversationId: string,
) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { job: true, offer: true },
  });
  if (!conversation) throw new AuthzError("Samtalen finnes ikke", 404);
  if (
    viewer.role !== "ADMIN" &&
    viewer.id !== conversation.customerId &&
    viewer.id !== conversation.providerId
  ) {
    throw new AuthzError("Du har ikke tilgang til denne samtalen", 403);
  }
  return conversation;
}

export async function getBookingForViewer(
  db: PrismaClient,
  viewer: Viewer,
  bookingId: string,
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { job: true, offer: true, payments: true },
  });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (
    viewer.role !== "ADMIN" &&
    viewer.id !== booking.customerId &&
    viewer.id !== booking.providerId
  ) {
    throw new AuthzError("Du har ikke tilgang til denne bookingen", 403);
  }
  return booking;
}

export function assertRole(viewer: Viewer | null, roles: Role[]): asserts viewer is Viewer {
  if (!viewer) {
    throw new AuthzError("Du må være innlogget", 401);
  }
  if (!roles.includes(viewer.role)) {
    throw new AuthzError("Du har ikke tilgang til denne siden", 403);
  }
}

export { assertCanViewOffers } from "./offer-access";
