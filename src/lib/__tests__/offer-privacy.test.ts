import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { createJob, createOffer, hashPassword } from "../domain";
import { getJobForViewer, getOfferForViewer } from "../authz";
import { toPublicJob } from "../contact";
import {
  assertCanViewOffers,
  listOffersForViewer,
  offerCountFirmsLabel,
  offerCountReceivedLabel,
  serializeOffersForClient,
} from "../offer-access";
import { orgNumberWithChecksum } from "../orgnr";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function extraProvider(name: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return db.user.create({
    data: {
      email: `${name.replace(/\s+/g, ".").toLowerCase()}-${suffix}@test.no`,
      passwordHash: await hashPassword("TestPass123!"),
      name,
      role: "PROVIDER",
      providerProfile: {
        create: {
          companyName: `${name} AS`,
          orgNumber: orgNumberWithChecksum("81234567"),
        },
      },
    },
  });
}

async function createAdmin() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return db.user.create({
    data: {
      email: `admin-${suffix}@test.no`,
      passwordHash: await hashPassword("TestPass123!"),
      name: "Admin",
      role: "ADMIN",
    },
  });
}

describe("private tilbud", () => {
  it("gir kunde alle tilbud, tilbyder bare eget+antall, andre bare antall, anonyme ingenting, admin alt", async () => {
    const users = await createTestUsers(db);
    const outsider = await extraProvider("Utenfor Firma");
    const admin = await createAdmin();
    const job = await createJob(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      {
        title: "Bytte kran",
        description: "Lekkasje på kjøkken.",
        category: "rorlegger",
        area: "Grünerløkka",
      },
    );
    const ownMessage = "Eget tilbud uten konkurrentinfo.";
    const rivalMessage = "Hemmelig rivalpris XYZ-LEKKASJE";
    const own = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 321_000,
      message: ownMessage,
    });
    const rival = await createOffer(db, { id: users.otherProvider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 654_321,
      message: rivalMessage,
    });

    const asCustomer = await listOffersForViewer(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      job.id,
    );
    expect(asCustomer.access).toBe("all");
    expect(asCustomer.offerCount).toBe(2);
    expect(asCustomer.offers.map((item) => item.id).sort()).toEqual([own.id, rival.id].sort());
    expect(asCustomer.offers.some((item) => item.amountOre === rival.amountOre)).toBe(true);

    const asOfferer = await listOffersForViewer(
      db,
      { id: users.provider.id, role: "PROVIDER" },
      job.id,
    );
    expect(asOfferer.access).toBe("own");
    expect(asOfferer.offerCount).toBe(2);
    expect(asOfferer.offers).toHaveLength(1);
    expect(asOfferer.offers[0]?.id).toBe(own.id);
    expect(asOfferer.offers[0]?.amountOre).toBe(321_000);
    const offererJson = JSON.stringify(serializeOffersForClient(asOfferer.offers));
    expect(offererJson).not.toContain("654321");
    expect(offererJson).not.toContain(rivalMessage);
    expect(offererJson).not.toContain(rival.id);

    const asOtherFirm = await listOffersForViewer(
      db,
      { id: outsider.id, role: "PROVIDER" },
      job.id,
    );
    expect(asOtherFirm.access).toBe("count");
    expect(asOtherFirm.offerCount).toBe(2);
    expect(asOtherFirm.offers).toEqual([]);
    expect(JSON.stringify(asOtherFirm.offers)).not.toContain("654321");
    expect(JSON.stringify(asOtherFirm)).not.toContain(rivalMessage);

    const asAnonymous = await listOffersForViewer(db, null, job.id);
    expect(asAnonymous.access).toBe("none");
    expect(asAnonymous.offers).toEqual([]);
    expect(JSON.stringify(asAnonymous.offers)).not.toContain("654321");

    const asAdmin = await listOffersForViewer(db, { id: admin.id, role: "ADMIN" }, job.id);
    expect(asAdmin.access).toBe("all");
    expect(asAdmin.offers).toHaveLength(2);

    const listedForOfferer = await assertCanViewOffers(
      db,
      { id: users.provider.id, role: "PROVIDER" },
      job.id,
    );
    expect(listedForOfferer.offers.every((item) => item.providerId === users.provider.id)).toBe(true);

    await expect(
      assertCanViewOffers(db, { id: outsider.id, role: "PROVIDER" }, job.id),
    ).rejects.toMatchObject({ status: 403 });

    await expect(
      assertCanViewOffers(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, job.id),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("avviser gjetting av andres tilbuds-id og lekker ikke payload på jobben", async () => {
    const users = await createTestUsers(db);
    const outsider = await extraProvider("Gjetende Bedrift");
    const job = await createJob(
      db,
      { id: users.customer.id, role: "CUSTOMER" },
      {
        title: "Male stue",
        description: "To strøk.",
        category: "maling",
        area: "Frogner",
      },
    );
    const secretMessage = "Konkurrenttekst-ALDRI-SYNLIG";
    const offer = await createOffer(db, { id: users.provider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 777_111,
      message: secretMessage,
    });
    await createOffer(db, { id: users.otherProvider.id, role: "PROVIDER" }, {
      jobId: job.id,
      amountOre: 888_222,
      message: "Andre firma sin pris",
    });

    await expect(
      getOfferForViewer(db, { id: users.otherProvider.id, role: "PROVIDER" }, offer.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getOfferForViewer(db, { id: outsider.id, role: "PROVIDER" }, offer.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getOfferForViewer(db, { id: users.otherCustomer.id, role: "CUSTOMER" }, offer.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      getOfferForViewer(db, { id: "missing-user", role: "PROVIDER" }, "guessed-offer-id"),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      getOfferForViewer(db, { id: users.provider.id, role: "PROVIDER" }, offer.id),
    ).resolves.toMatchObject({ id: offer.id, amountOre: 777_111 });
    await expect(
      getOfferForViewer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id),
    ).resolves.toMatchObject({ id: offer.id });

    const jobForRival = await getJobForViewer(
      db,
      { id: users.otherProvider.id, role: "PROVIDER" },
      job.id,
    );
    expect(jobForRival).not.toHaveProperty("offers");
    const publicJob = toPublicJob(jobForRival);
    const publicJson = JSON.stringify(publicJob);
    expect(publicJson).not.toContain("777111");
    expect(publicJson).not.toContain(secretMessage);
    expect(publicJson).not.toContain("888222");
    expect(publicJson).not.toMatch(/vinnende tilbud/i);
  });

  it("viser norsk antall uten å late som priser er offentlige", () => {
    expect(offerCountReceivedLabel(0)).toBe("Ingen tilbud mottatt ennå.");
    expect(offerCountReceivedLabel(1)).toBe("1 tilbud mottatt");
    expect(offerCountReceivedLabel(3)).toBe("3 tilbud mottatt");
    expect(offerCountFirmsLabel(3)).toBe("3 bedrifter har allerede sendt tilbud");
    expect(`${offerCountReceivedLabel(3)} ${offerCountFirmsLabel(3)}`.toLowerCase()).not.toContain(
      "vinnende",
    );
  });
});
