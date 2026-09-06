import type { BookingStatus, PrismaClient } from "@prisma/client";

const UNLOCKED_STATUSES: BookingStatus[] = [
  "PAID",
  "IN_PROGRESS",
  "COMPLETED",
  "DISPUTED",
];

export function isContactUnlockedStatus(status: BookingStatus): boolean {
  return UNLOCKED_STATUSES.includes(status);
}

export async function hasServerConfirmedPayment(
  db: PrismaClient,
  bookingId: string,
): Promise<boolean> {
  const succeeded = await db.payment.findFirst({
    where: { bookingId, status: "SUCCEEDED" },
  });
  return Boolean(succeeded);
}

export async function canViewerSeeContact(
  db: PrismaClient,
  input: { viewerId: string; jobId: string },
): Promise<boolean> {
  const booking = await db.booking.findUnique({
    where: { jobId: input.jobId },
  });
  if (!booking) return false;
  if (booking.customerId !== input.viewerId && booking.providerId !== input.viewerId) {
    return false;
  }
  if (!booking.contactUnlockedAt) return false;
  if (!isContactUnlockedStatus(booking.status)) return false;
  return hasServerConfirmedPayment(db, booking.id);
}

export type PublicJob = {
  id: string;
  title: string;
  description: string;
  category: string;
  area: string;
  postalCode: string | null;
  budgetMinOre: number | null;
  budgetMaxOre: number | null;
  status: string;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    area: string | null;
  };
};

export function toPublicJob(job: {
  id: string;
  title: string;
  description: string;
  category: string;
  area: string;
  postalCode: string | null;
  budgetMinOre: number | null;
  budgetMaxOre: number | null;
  status: string;
  createdAt: Date;
  customer: { id: string; name: string; customerProfile: { area: string | null } | null };
}): PublicJob {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    area: job.area,
    postalCode: job.postalCode,
    budgetMinOre: job.budgetMinOre,
    budgetMaxOre: job.budgetMaxOre,
    status: job.status,
    createdAt: job.createdAt,
    customer: {
      id: job.customer.id,
      name: job.customer.name,
      area: job.customer.customerProfile?.area ?? job.area,
    },
  };
}

export type ContactPayload = {
  unlocked: true;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
  };
  provider: {
    name: string;
    email: string;
    phone: string | null;
    companyName: string | null;
    invoiceEmail: string | null;
  };
};

export async function getContactPayload(
  db: PrismaClient,
  input: { viewerId: string; jobId: string },
): Promise<ContactPayload | { unlocked: false; reason: string }> {
  const allowed = await canViewerSeeContact(db, input);
  if (!allowed) {
    return {
      unlocked: false,
      reason:
        "Kontaktopplysninger vises først når bookingen er betalt og bekreftet av serveren. En suksess-side alene er ikke nok.",
    };
  }

  const booking = await db.booking.findUniqueOrThrow({
    where: { jobId: input.jobId },
    include: {
      job: true,
      customer: { include: { customerProfile: true } },
      provider: { include: { providerProfile: true } },
    },
  });

  return {
    unlocked: true,
    customer: {
      name: booking.customer.name,
      email: booking.customer.email,
      phone: booking.customer.phone,
      addressLine: booking.job.addressLine ?? booking.customer.customerProfile?.addressLine ?? null,
      postalCode: booking.job.postalCode ?? booking.customer.customerProfile?.postalCode ?? null,
      city: booking.customer.customerProfile?.city ?? null,
    },
    provider: {
      name: booking.provider.name,
      email: booking.provider.email,
      phone: booking.provider.phone,
      companyName: booking.provider.providerProfile?.companyName ?? null,
      invoiceEmail: booking.provider.providerProfile?.invoiceEmail ?? null,
    },
  };
}
