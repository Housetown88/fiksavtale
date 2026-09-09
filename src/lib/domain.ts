import { Prisma, type Offer, type PrismaClient } from "@prisma/client";
import { assertNoContactLeak } from "./leak-filter";
import { calcCommission } from "./money";
import { isValidOrgNumber, normalizeOrgNumber } from "./orgnr";
import { getPlatformFeeBps } from "./settings";
import { AuthzError, type Viewer } from "./authz";
import { parseBudgetRange } from "./budget";
import { hashSessionToken, randomToken, sha256 } from "./crypto";
import bcrypt from "bcryptjs";
import { lookupOrgInBrreg } from "./brreg";
import { sendPasswordResetEmail } from "./email";
import { hitRateLimit } from "./rate-limit";
import { LEDGER, postLedger } from "./ledger";
import { refundBooking } from "./payments";
import { summarizeBookingMoney, unpaidApprovedExtras } from "./booking-totals";
import { ensureProviderAlertPreference, assertValidJobTaxonomy } from "./job-alerts";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  db: PrismaClient,
  input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: "CUSTOMER" | "PROVIDER";
    area?: string;
    addressLine?: string;
    postalCode?: string;
    city?: string;
    companyName?: string;
    orgNumber?: string;
    about?: string;
    serviceAreas?: string;
    alertCategories?: string[];
    alertAreas?: string[];
    alertRadiusKm?: number | null;
    alertEmailEnabled?: boolean;
  },
) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Det finnes allerede en konto med denne e-postadressen.");
  }
  if (input.password.length < 8) {
    throw new Error("Passordet må ha minst 8 tegn.");
  }
  if (input.role === "PROVIDER") {
    if (!input.companyName || !input.orgNumber) {
      throw new Error("Firmakonto krever firmanavn og organisasjonsnummer.");
    }
    if (!isValidOrgNumber(input.orgNumber)) {
      throw new Error("Organisasjonsnummeret er ugyldig (sjekk siffer og kontrollsiffer).");
    }
    if (input.about) assertNoContactLeak(input.about);
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      role: input.role,
      customerProfile:
        input.role === "CUSTOMER"
          ? {
              create: {
                area: input.area ?? null,
                addressLine: input.addressLine ?? null,
                postalCode: input.postalCode ?? null,
                city: input.city ?? "Oslo",
              },
            }
          : undefined,
      providerProfile:
        input.role === "PROVIDER"
          ? {
              create: {
                companyName: input.companyName!,
                orgNumber: normalizeOrgNumber(input.orgNumber!),
                orgVerified: true,
                orgRegisterStatus: "NOT_CHECKED",
                about: input.about ?? null,
                serviceAreas: input.serviceAreas ?? null,
                invoiceEmail: email,
              },
            }
          : undefined,
    },
  });
  if (input.role === "PROVIDER") {
    await ensureProviderAlertPreference(db, user.id, {
      categories: input.alertCategories ?? [],
      areas: input.alertAreas ?? [],
      radiusKm: input.alertRadiusKm ?? null,
      emailEnabled: Boolean(input.alertEmailEnabled),
      paused: false,
    });
  }
  if (
    input.role === "PROVIDER" &&
    input.orgNumber &&
    input.companyName &&
    process.env.VITEST !== "true" &&
    process.env.BRREG_LOOKUP !== "0"
  ) {
    const lookup = await lookupOrgInBrreg(input.orgNumber, input.companyName);
    await db.providerProfile.update({
      where: { userId: user.id },
      data: {
        orgRegisterStatus: lookup.status,
        orgRegisterName: lookup.registerName,
        orgLookupAt: new Date(),
      },
    });
  }
  return user;
}

function jobFields(input: {
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  area: string;
  postalCode?: string;
  addressLine?: string;
  budgetMinOre?: number | null;
  budgetMaxOre?: number | null;
}) {
  assertNoContactLeak(input.title);
  assertNoContactLeak(input.description);
  if (!input.title.trim() || !input.description.trim()) {
    throw new Error("Tittel og beskrivelse må fylles ut.");
  }
  const subcategory = input.subcategory?.trim() || null;
  assertValidJobTaxonomy(input.category, subcategory);
  if (input.budgetMinOre != null && input.budgetMinOre < 0) {
    throw new Error("Budsjett fra kan ikke være negativt.");
  }
  if (input.budgetMaxOre != null && input.budgetMaxOre < 0) {
    throw new Error("Budsjett til kan ikke være negativt.");
  }
  if (
    input.budgetMinOre != null &&
    input.budgetMaxOre != null &&
    input.budgetMinOre > input.budgetMaxOre
  ) {
    throw new Error("Budsjett fra kan ikke være høyere enn budsjett til.");
  }
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    subcategory,
    area: input.area.trim(),
    postalCode: input.postalCode?.trim() || null,
    addressLine: input.addressLine?.trim() || null,
    budgetMinOre: input.budgetMinOre ?? null,
    budgetMaxOre: input.budgetMaxOre ?? null,
  };
}

export async function createJob(
  db: PrismaClient,
  viewer: Viewer,
  input: {
    title: string;
    description: string;
    category: string;
    subcategory?: string | null;
    area: string;
    postalCode?: string;
    addressLine?: string;
    budgetMinOre?: number | null;
    budgetMaxOre?: number | null;
  },
) {
  if (viewer.role !== "CUSTOMER" && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare kunder kan legge ut oppdrag", 403);
  }
  return db.job.create({
    data: {
      customerId: viewer.id,
      ...jobFields(input),
    },
  });
}

export async function updateJob(
  db: PrismaClient,
  viewer: Viewer,
  jobId: string,
  input: {
    title: string;
    description: string;
    category: string;
    subcategory?: string | null;
    area: string;
    postalCode?: string;
    addressLine?: string;
    budgetMinOre?: number | null;
    budgetMaxOre?: number | null;
  },
) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { offers: true },
  });
  if (!job) throw new AuthzError("Oppdraget finnes ikke", 404);
  if (job.customerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare eieren kan redigere oppdraget", 403);
  }
  if (job.status !== "OPEN") {
    throw new Error("Oppdraget kan bare redigeres så lenge det er åpent og uten valgt tilbud.");
  }
  return db.job.update({
    where: { id: job.id },
    data: jobFields(input),
  });
}

export async function updateProfile(
  db: PrismaClient,
  viewer: Viewer,
  input: {
    name: string;
    phone?: string;
    area?: string;
    addressLine?: string;
    postalCode?: string;
    city?: string;
    about?: string;
    serviceAreas?: string;
  },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Navn må fylles ut.");
  if (input.about) assertNoContactLeak(input.about);
  await db.user.update({
    where: { id: viewer.id },
    data: {
      name,
      phone: input.phone?.trim() || null,
    },
  });
  const user = await db.user.findUniqueOrThrow({
    where: { id: viewer.id },
    include: { customerProfile: true, providerProfile: true },
  });
  if (user.customerProfile) {
    await db.customerProfile.update({
      where: { userId: viewer.id },
      data: {
        area: input.area?.trim() || null,
        addressLine: input.addressLine?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        city: input.city?.trim() || null,
      },
    });
  }
  if (user.providerProfile) {
    await db.providerProfile.update({
      where: { userId: viewer.id },
      data: {
        about: input.about?.trim() || null,
        serviceAreas: input.serviceAreas?.trim() || null,
      },
    });
  }
  return db.user.findUniqueOrThrow({
    where: { id: viewer.id },
    include: { customerProfile: true, providerProfile: true },
  });
}

export function parseJobBudget(form: { budgetMin?: unknown; budgetMax?: unknown }) {
  return parseBudgetRange(form);
}

export type CreateOfferResult = {
  offer: Offer;
  created: boolean;
};

export async function createOffer(
  db: PrismaClient,
  viewer: Viewer,
  input: { jobId: string; amountOre: number; message: string },
) {
  return (await createOfferResult(db, viewer, input)).offer;
}

export async function createOfferResult(
  db: PrismaClient,
  viewer: Viewer,
  input: { jobId: string; amountOre: number; message: string },
): Promise<CreateOfferResult> {
  if (viewer.role !== "PROVIDER") {
    throw new AuthzError("Bare registrerte bedrifter kan sende tilbud", 403);
  }
  const provider = await db.user.findUnique({
    where: { id: viewer.id },
    include: { providerProfile: true },
  });
  if (!provider?.providerProfile) {
    throw new AuthzError("Firmaprofil mangler", 403);
  }

  const job = await db.job.findUnique({ where: { id: input.jobId } });
  if (job?.customerId === viewer.id) {
    throw new Error("Du kan ikke gi tilbud på eget oppdrag.");
  }

  const existing = job
    ? await db.offer.findFirst({
        where: { jobId: job.id, providerId: viewer.id, status: "PENDING" },
      })
    : null;
  if (existing) {
    return { offer: existing, created: false };
  }

  if (input.amountOre < 10000) {
    throw new Error("Tilbudet må være minst 100 NOK.");
  }
  assertNoContactLeak(input.message);

  if (!job || job.status !== "OPEN") {
    throw new Error("Oppdraget er ikke åpent for nye tilbud.");
  }

  return db.$transaction(async (tx) => {
    const pending = await tx.offer.findFirst({
      where: { jobId: job.id, providerId: viewer.id, status: "PENDING" },
    });
    if (pending) {
      return { offer: pending, created: false };
    }

    const conversation = await tx.conversation.findUnique({
      where: { jobId_providerId: { jobId: job.id, providerId: viewer.id } },
    });
    if (conversation?.offerId) {
      const linked = await tx.offer.findUnique({ where: { id: conversation.offerId } });
      if (linked?.status === "PENDING") {
        return { offer: linked, created: false };
      }
    }

    const offer = await tx.offer.create({
      data: {
        jobId: job.id,
        providerId: viewer.id,
        amountOre: input.amountOre,
        message: input.message.trim(),
      },
    });

    if (conversation) {
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { offerId: offer.id },
      });
      return { offer, created: true };
    }

    try {
      await tx.conversation.create({
        data: {
          jobId: job.id,
          providerId: viewer.id,
          customerId: job.customerId,
          offerId: offer.id,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      const winner = await tx.offer.findFirst({
        where: {
          jobId: job.id,
          providerId: viewer.id,
          status: "PENDING",
          id: { not: offer.id },
        },
      });
      if (!winner) throw error;
      await tx.offer.delete({ where: { id: offer.id } });
      return { offer: winner, created: false };
    }

    return { offer, created: true };
  });
}

export async function sendMessage(
  db: PrismaClient,
  viewer: Viewer,
  input: { conversationId: string; body: string },
) {
  const conversation = await db.conversation.findUnique({
    where: { id: input.conversationId },
  });
  if (!conversation) {
    throw new AuthzError("Samtalen finnes ikke", 404);
  }
  if (viewer.id !== conversation.customerId && viewer.id !== conversation.providerId) {
    throw new AuthzError("Du har ikke tilgang til denne samtalen", 403);
  }
  if (!input.body.trim()) {
    throw new Error("Meldingen kan ikke være tom.");
  }
  assertNoContactLeak(input.body);
  return db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: viewer.id,
      body: input.body.trim(),
    },
  });
}

export async function acceptOffer(
  db: PrismaClient,
  viewer: Viewer,
  offerId: string,
) {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { job: true },
  });
  if (!offer) throw new AuthzError("Tilbudet finnes ikke", 404);
  if (offer.job.customerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare kunden kan godta et tilbud", 403);
  }
  if (offer.status !== "PENDING" || offer.job.status !== "OPEN") {
    throw new Error("Tilbudet kan ikke godtas nå.");
  }

  const platformFeeBps = await getPlatformFeeBps(db);
  const { platformFeeOre, providerPayoutOre } = calcCommission(offer.amountOre, platformFeeBps);

  const booking = await db.$transaction(async (tx) => {
    const locked = await tx.job.updateMany({
      where: { id: offer.jobId, status: "OPEN" },
      data: { status: "OFFER_ACCEPTED" },
    });
    if (locked.count !== 1) {
      throw new Error("Tilbudet kan ikke godtas nå.");
    }
    await tx.offer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED" },
    });
    await tx.offer.updateMany({
      where: { jobId: offer.jobId, id: { not: offer.id }, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    return tx.booking.create({
      data: {
        jobId: offer.jobId,
        offerId: offer.id,
        customerId: offer.job.customerId,
        providerId: offer.providerId,
        amountOre: offer.amountOre,
        platformFeeOre,
        providerPayoutOre,
        platformFeeBps,
        status: "PENDING_PAYMENT",
      },
    });
  });

  return booking;
}

export async function markWorkStarted(db: PrismaClient, viewer: Viewer, bookingId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (booking.providerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare utførende bedrift kan starte arbeidet", 403);
  }
  if (booking.status !== "PAID") {
    throw new Error("Arbeidet kan først startes etter bekreftet betaling.");
  }
  return db.$transaction(async (tx) => {
    await tx.job.update({ where: { id: booking.jobId }, data: { status: "IN_PROGRESS" } });
    return tx.booking.update({
      where: { id: booking.id },
      data: { status: "IN_PROGRESS", workStartedAt: new Date() },
    });
  });
}

function assertCanCompleteBooking(booking: { status: string; extras: { status: string }[] }) {
  if (booking.status !== "IN_PROGRESS" && booking.status !== "PAID") {
    throw new Error("Bookingen kan ikke fullføres i denne tilstanden.");
  }
  if (unpaidApprovedExtras(booking.extras).length > 0) {
    throw new Error("Godkjente tillegg må betales før jobben kan fullføres.");
  }
}

export async function completeBooking(db: PrismaClient, viewer: Viewer, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { extras: true },
  });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (booking.customerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare kunden kan godkjenne ferdig arbeid", 403);
  }
  assertCanCompleteBooking(booking);
  return db.$transaction(async (tx) => {
    const fresh = await tx.booking.findUnique({
      where: { id: booking.id },
      include: { extras: true },
    });
    if (!fresh) throw new AuthzError("Bookingen finnes ikke", 404);
    assertCanCompleteBooking(fresh);

    await tx.extraCharge.updateMany({
      where: { bookingId: booking.id, status: "PROPOSED" },
      data: { status: "REJECTED" },
    });
    const updated = await tx.booking.updateMany({
      where: { id: booking.id, status: { in: ["PAID", "IN_PROGRESS"] } },
      data: { status: "COMPLETED", completedAt: new Date(), payoutReleasedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new Error("Bookingen kan ikke fullføres i denne tilstanden.");
    }
    await tx.job.update({ where: { id: booking.jobId }, data: { status: "COMPLETED" } });
    const money = summarizeBookingMoney(fresh.amountOre, fresh.extras, fresh.platformFeeBps, {
      refundedOre: fresh.refundedOre,
    });
    await postLedger(tx, {
      bookingId: booking.id,
      type: LEDGER.PAYOUT_ACCRUAL,
      amountOre: money.settlementAfterRefundOre,
      eventId: `payout_${booking.id}`,
      note: "Oppgjør til firma etter kundegodkjenning. DEMO: ingen ekte utbetaling.",
    });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  });
}

export async function createReview(
  db: PrismaClient,
  viewer: Viewer,
  input: { bookingId: string; rating: number; comment: string },
) {
  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (booking.status !== "COMPLETED") {
    throw new Error("Anmeldelse kan bare skrives etter fullført, betalt oppdrag.");
  }
  if (viewer.id !== booking.customerId) {
    throw new AuthzError("I denne prototypen kan bare kunden anmelde bedriften", 403);
  }
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Vurdering må være mellom 1 og 5.");
  }
  assertNoContactLeak(input.comment);
  const existing = await db.review.findUnique({ where: { bookingId: booking.id } });
  if (existing) {
    throw new Error("Dette oppdraget er allerede anmeldt.");
  }
  return db.review.create({
    data: {
      bookingId: booking.id,
      authorId: viewer.id,
      targetId: booking.providerId,
      rating: input.rating,
      comment: input.comment.trim(),
    },
  });
}

export async function createReport(
  db: PrismaClient,
  viewer: Viewer,
  input: { reason: string; details?: string; targetUserId?: string; targetJobId?: string },
) {
  if (!input.reason.trim()) {
    throw new Error("Oppgi en grunn for rapporten.");
  }
  return db.report.create({
    data: {
      reporterId: viewer.id,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      targetUserId: input.targetUserId ?? null,
      targetJobId: input.targetJobId ?? null,
    },
  });
}

export async function proposeExtra(
  db: PrismaClient,
  viewer: Viewer,
  input: { bookingId: string; title: string; amountOre: number },
) {
  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (booking.providerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare bedriften kan foreslå tillegg", 403);
  }
  if (!["PAID", "IN_PROGRESS"].includes(booking.status)) {
    throw new Error("Tillegg kan bare foreslås på aktive, betalte bookinger.");
  }
  assertNoContactLeak(input.title);
  if (!Number.isFinite(input.amountOre) || input.amountOre < 10000) {
    throw new Error("Tillegg må være minst 100 NOK.");
  }
  return db.extraCharge.create({
    data: {
      bookingId: booking.id,
      title: input.title.trim(),
      amountOre: input.amountOre,
    },
  });
}

export async function decideExtra(
  db: PrismaClient,
  viewer: Viewer,
  extraId: string,
  decision: "APPROVED" | "REJECTED",
) {
  const extra = await db.extraCharge.findUnique({
    where: { id: extraId },
    include: { booking: true },
  });
  if (!extra) throw new AuthzError("Tillegget finnes ikke", 404);
  if (extra.booking.customerId !== viewer.id && viewer.role !== "ADMIN") {
    throw new AuthzError("Bare kunden kan godkjenne tillegg", 403);
  }
  return db.extraCharge.update({
    where: { id: extra.id },
    data: { status: decision },
  });
}

export async function cancelBooking(
  db: PrismaClient,
  viewer: Viewer,
  bookingId: string,
  reason: string,
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { extras: true, payments: true },
  });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (
    viewer.role !== "ADMIN" &&
    viewer.id !== booking.customerId &&
    viewer.id !== booking.providerId
  ) {
    throw new AuthzError("Du kan ikke avbestille denne bookingen", 403);
  }
  if (["COMPLETED", "REFUNDED", "CANCELLED", "DISPUTED"].includes(booking.status)) {
    throw new Error("Bookingen kan ikke avbestilles i denne tilstanden.");
  }
  if (booking.status === "IN_PROGRESS" || booking.workStartedAt) {
    return db.$transaction(async (tx) => {
      await tx.job.update({ where: { id: booking.jobId }, data: { status: "DISPUTED" } });
      await postLedger(tx, {
        bookingId: booking.id,
        type: LEDGER.DISPUTE_HOLD,
        amountOre: summarizeBookingMoney(booking.amountOre, booking.extras, booking.platformFeeBps).fundedOre,
        eventId: `dispute_${booking.id}`,
        note: "Avbestilling etter start åpner tvist. Oppgjør holdes.",
      });
      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "DISPUTED",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
    });
  }

  const funded = booking.payments.some((payment) => payment.status === "SUCCEEDED");
  if (funded && booking.status === "PAID") {
    const money = summarizeBookingMoney(booking.amountOre, booking.extras, booking.platformFeeBps, {
      refundedOre: booking.refundedOre,
    });
    const remaining = Math.max(0, money.fundedOre - booking.refundedOre);
    if (remaining > 0) {
      await refundBooking(db, booking.id, remaining, `cancel_refund_${booking.id}`);
    }
    await db.job.update({ where: { id: booking.jobId }, data: { status: "CANCELLED" } });
    return db.booking.update({
      where: { id: booking.id },
      data: {
        status: "REFUNDED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  }

  await db.paymentIntent.updateMany({
    where: { bookingId: booking.id, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
  return db.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: booking.jobId },
      data: { status: "CANCELLED" },
    });
    return tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  });
}

export async function applyApprovalTimeout(db: PrismaClient, bookingId: string, now = new Date()) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { extras: true },
  });
  if (!booking) throw new AuthzError("Bookingen finnes ikke", 404);
  if (!booking.approvalDeadlineAt || booking.approvalDeadlineAt > now) {
    throw new Error("Godkjenningsfristen er ikke utløpt.");
  }
  if (!["PAID", "IN_PROGRESS"].includes(booking.status)) {
    throw new Error("Bookingen kan ikke auto-godkjennes i denne tilstanden.");
  }
  if (unpaidApprovedExtras(booking.extras).length > 0) {
    throw new Error("Godkjente tillegg må betales før auto-godkjenning.");
  }
  return completeBooking(db, { id: booking.customerId, role: "CUSTOMER" }, booking.id);
}

export async function requestPasswordReset(
  db: PrismaClient,
  email: string,
  options?: { ip?: string | null },
) {
  const normalized = email.trim().toLowerCase();
  const emailKey = `reset:email:${sha256(normalized)}`;
  const emailLimit = await hitRateLimit(db, emailKey, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) {
    return { created: false as const, token: null, emailed: false, rateLimited: true };
  }
  if (options?.ip) {
    const ipLimit = await hitRateLimit(db, `reset:ip:${sha256(options.ip)}`, 10, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      return { created: false as const, token: null, emailed: false, rateLimited: true };
    }
  }
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user || user.deletedAt) return { created: false as const, token: null, emailed: false, rateLimited: false };
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = randomToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token, process.env.SESSION_SECRET || process.env.AUTH_SECRET || "dev"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const emailed = await sendPasswordResetEmail({ to: user.email, token });
  return { created: true as const, token, emailed: emailed.sent, rateLimited: false };
}

export async function resetPasswordWithToken(db: PrismaClient, token: string, password: string) {
  if (password.length < 8) {
    throw new Error("Passordet må ha minst 8 tegn.");
  }
  const tokenHash = hashSessionToken(token, process.env.SESSION_SECRET || process.env.AUTH_SECRET || "dev");
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new Error("Lenken er ugyldig eller utløpt.");
  }
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password) },
    });
    await tx.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await tx.session.deleteMany({ where: { userId: row.userId } });
  });
}
