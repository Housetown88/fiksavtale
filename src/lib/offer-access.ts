import type { PrismaClient } from "@prisma/client";
import { AuthzError, type Viewer } from "./authz";

export type OfferListAccess = "all" | "own" | "count" | "none";

const offerDetailInclude = {
  provider: { include: { providerProfile: true, reviewsReceived: true } },
} as const;

export type ListedOffer = Awaited<
  ReturnType<typeof loadOffers>
>[number];

async function loadOffers(
  db: PrismaClient,
  where: { jobId: string; providerId?: string },
) {
  return db.offer.findMany({
    where,
    include: offerDetailInclude,
    orderBy: { createdAt: "desc" },
  });
}

export type OfferListForViewer = {
  access: OfferListAccess;
  offerCount: number;
  offers: ListedOffer[];
};

export async function listOffersForViewer(
  db: PrismaClient,
  viewer: Viewer | null,
  jobId: string,
): Promise<OfferListForViewer> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      booking: { select: { providerId: true } },
      _count: { select: { offers: true } },
    },
  });
  if (!job) throw new AuthzError("Oppdraget finnes ikke", 404);

  const offerCount = job._count.offers;
  const isOwner = Boolean(viewer && (viewer.role === "ADMIN" || viewer.id === job.customerId));

  if (job.status !== "OPEN" && !isOwner) {
    const involved = viewer
      ? job.booking?.providerId === viewer.id ||
        Boolean(
          await db.offer.findFirst({
            where: { jobId: job.id, providerId: viewer.id },
            select: { id: true },
          }),
        )
      : false;
    if (!involved) {
      throw new AuthzError("Du har ikke tilgang til tilbudene på dette oppdraget", 403);
    }
  }

  if (!viewer) {
    return { access: "none", offerCount, offers: [] };
  }

  if (viewer.role === "ADMIN" || viewer.id === job.customerId) {
    return {
      access: "all",
      offerCount,
      offers: await loadOffers(db, { jobId: job.id }),
    };
  }

  const own = await loadOffers(db, { jobId: job.id, providerId: viewer.id });
  if (own.length > 0 || job.booking?.providerId === viewer.id) {
    return { access: "own", offerCount, offers: own };
  }

  if (viewer.role === "PROVIDER") {
    return { access: "count", offerCount, offers: [] };
  }

  return { access: "none", offerCount, offers: [] };
}

export type ClientOffer = {
  id: string;
  jobId: string;
  providerId: string;
  amountOre: number;
  message: string;
  status: string;
  createdAt: Date;
};

export function serializeOffersForClient(offers: Array<{
  id: string;
  jobId: string;
  providerId: string;
  amountOre: number;
  message: string;
  status: string;
  createdAt: Date;
}>): ClientOffer[] {
  return offers.map((offer) => ({
    id: offer.id,
    jobId: offer.jobId,
    providerId: offer.providerId,
    amountOre: offer.amountOre,
    message: offer.message,
    status: offer.status,
    createdAt: offer.createdAt,
  }));
}

export async function assertCanViewOffers(
  db: PrismaClient,
  viewer: Viewer,
  jobId: string,
) {
  const listed = await listOffersForViewer(db, viewer, jobId);
  if (listed.access !== "all" && listed.access !== "own") {
    throw new AuthzError("Du har ikke tilgang til tilbudene på dette oppdraget", 403);
  }
  return listed;
}

export function offerCountReceivedLabel(count: number): string {
  if (count <= 0) return "Ingen tilbud mottatt ennå.";
  if (count === 1) return "1 tilbud mottatt";
  return `${count} tilbud mottatt`;
}

export function offerCountFirmsLabel(count: number): string {
  if (count <= 0) return "Ingen bedrifter har sendt tilbud ennå.";
  if (count === 1) return "1 bedrift har allerede sendt tilbud";
  return `${count} bedrifter har allerede sendt tilbud`;
}
