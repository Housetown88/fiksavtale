import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";
import { canViewerSeeContact, getContactPayload, toPublicJob } from "../contact";
import { createPaymentIntent, handlePaymentWebhook } from "../payments";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("kontaktlås", () => {
  it("offentlig jobb visning skjuler adresse, telefon og e-post", async () => {
    const { customer } = await createTestUsers(db);
    const job = await createJob(db, { id: customer.id, role: "CUSTOMER" }, {
      title: "Bytte sikringsskap",
      description: "Gammelt skap i leilighet.",
      category: "elektriker",
      area: "Grünerløkka",
      postalCode: "0550",
      addressLine: "Markveien 12",
    });
    const full = await db.job.findUniqueOrThrow({
      where: { id: job.id },
      include: { customer: { include: { customerProfile: true } } },
    });
    const publicJob = toPublicJob(full);
    expect(JSON.stringify(publicJob)).not.toContain("Markveien 12");
    expect(JSON.stringify(publicJob)).not.toContain("40000001");
    expect(JSON.stringify(publicJob)).not.toContain(customer.email);
  });

  it("låser kontakt inntil booking finnes OG betaling er bekreftet på server", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Fikse stikkontakt",
      description: "Virker ikke i stua.",
      category: "elektriker",
      area: "Grünerløkka",
      addressLine: "Markveien 12",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 500_000,
      message: "Kan komme onsdag. Fastpris inkludert materiell.",
    });

    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(false);

    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    expect(booking.status).toBe("PENDING_PAYMENT");
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(false);
    expect(await canViewerSeeContact(db, { viewerId: users.customer.id, jobId: job.id })).toBe(false);

    const intent = await createPaymentIntent(db, booking.id);

    const lockedAfterRedirect = await getContactPayload(db, {
      viewerId: users.provider.id,
      jobId: job.id,
    });
    expect(lockedAfterRedirect.unlocked).toBe(false);

    await handlePaymentWebhook(db, {
      eventId: "evt_fail_1",
      type: "payment.failed",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(false);

    const intent2 = await createPaymentIntent(db, booking.id);
    await handlePaymentWebhook(db, {
      eventId: "evt_ok_1",
      type: "payment.succeeded",
      paymentIntentId: intent2.id,
      bookingId: booking.id,
    });

    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(true);
    expect(await canViewerSeeContact(db, { viewerId: users.customer.id, jobId: job.id })).toBe(true);
    expect(await canViewerSeeContact(db, { viewerId: users.otherProvider.id, jobId: job.id })).toBe(false);

    const payload = await getContactPayload(db, { viewerId: users.provider.id, jobId: job.id });
    expect(payload.unlocked).toBe(true);
    if (payload.unlocked) {
      expect(payload.customer.addressLine).toBe("Markveien 12");
      expect(payload.customer.email).toBe(users.customer.email);
      expect(payload.customer.phone).toBe("40000001");
    }
  });

  it("kansellert betaling låser ikke opp kontakt", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Bytte dimmer",
      description: "Trenger ny dimmer i gangen.",
      category: "elektriker",
      area: "Sagene",
      addressLine: "Bentsebrugata 5",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 200_000,
      message: "Kan gjøres på en time.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    const intent = await createPaymentIntent(db, booking.id);
    await handlePaymentWebhook(db, {
      eventId: "evt_cancel_1",
      type: "payment.cancelled",
      paymentIntentId: intent.id,
      bookingId: booking.id,
    });
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.contactUnlockedAt).toBeNull();
    expect(after.status).toBe("PENDING_PAYMENT");
    expect(await canViewerSeeContact(db, { viewerId: users.provider.id, jobId: job.id })).toBe(false);
  });
});
