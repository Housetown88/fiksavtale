import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import {
  acceptOffer,
  createJob,
  createOffer,
  sendMessage,
} from "../domain";
import {
  AuthzError,
  getBookingForViewer,
  getConversationForViewer,
  getJobForViewer,
  getOfferForViewer,
} from "../authz";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("tilgangskontroll", () => {
  it("hindrer uvedkommende i å lese andres oppdrag, tilbud og meldinger", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Privat oppussing",
      description: "Maling av soverom.",
      category: "maling",
      area: "Frogner",
      addressLine: "Bygdøy allé 1",
    });
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 300_000,
      message: "Kan starte mandag.",
    });
    const conversation = await db.conversation.findFirstOrThrow({
      where: { jobId: job.id, providerId: users.provider.id },
    });
    await sendMessage(db, { id: users.customer.id, role: "CUSTOMER" }, {
      conversationId: conversation.id,
      body: "Høres bra ut, når kan dere komme?",
    });

    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });

    await expect(
      getJobForViewer(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, job.id),
    ).rejects.toBeInstanceOf(AuthzError);

    await expect(
      getOfferForViewer(db, { id: users.otherProvider.id, role: "PROVIDER" }, offer.id),
    ).rejects.toMatchObject({ status: 403 });

    await expect(
      getConversationForViewer(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, conversation.id),
    ).rejects.toMatchObject({ status: 403 });

    await expect(
      sendMessage(db, { id: users.otherProvider.id, role: "PROVIDER" }, {
        conversationId: conversation.id,
        body: "Hei, jeg vil også gi tilbud.",
      }),
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("slipper gjennom eiere og involvert bedrift", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Nytt oppdrag",
      description: "Bytte kran på kjøkken.",
      category: "rorlegger",
      area: "Tøyen",
    });
    const offer = await createOffer(db, { id: users.otherProvider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 250_000,
      message: "Inkludert kran av god kvalitet.",
    });
    const booking = await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);
    const conversation = await db.conversation.findFirstOrThrow({
      where: { jobId: job.id, providerId: users.otherProvider.id },
    });

    await expect(getJobForViewer(db, { id: users.customer.id, role: "CUSTOMER" }, job.id)).resolves.toBeTruthy();
    await expect(getOfferForViewer(db, { id: users.otherProvider.id, role: "PROVIDER" }, offer.id)).resolves.toBeTruthy();
    await expect(
      getConversationForViewer(db, { id: users.customer.id, role: "CUSTOMER" }, conversation.id),
    ).resolves.toBeTruthy();
    await expect(
      getBookingForViewer(db, { id: users.otherProvider.id, role: "PROVIDER" }, booking.id),
    ).resolves.toBeTruthy();
    await expect(
      getBookingForViewer(db, { id: users.provider.id, role: "PROVIDER" }, booking.id),
    ).rejects.toMatchObject({ status: 403 });
  });
});
