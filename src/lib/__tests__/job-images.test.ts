import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { createTestUsers, setupTestDb } from "./helpers";
import { acceptOffer, createJob, createOffer } from "../domain";
import { AuthzError, getJobForViewer } from "../authz";
import { canViewerSeeContact } from "../contact";
import {
  JobImageError,
  MAX_JOB_IMAGES,
  processJobImage,
  saveJobImages,
} from "../job-images";

let db: PrismaClient;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await db?.$disconnect();
});

async function pngFile(name: string, size = 40) {
  const buffer = await sharp({
    create: { width: size, height: size, channels: 3, background: { r: 20, g: 80, b: 50 } },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

describe("oppdragsbilder", () => {
  it("re-koder til JPEG uten å beholde originalformatet", async () => {
    const png = await sharp({
      create: { width: 80, height: 60, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();
    const processed = await processJobImage(png);
    expect(processed.mimeType).toBe("image/jpeg");
    expect(processed.data[0]).toBe(0xff);
    expect(processed.data[1]).toBe(0xd8);
    expect(processed.thumb[0]).toBe(0xff);
    expect(processed.width).toBeGreaterThan(0);
  });

  it("avviser filer som ikke er jpeg/png/webp", async () => {
    await expect(processJobImage(Buffer.from("ikke-et-bilde"))).rejects.toBeInstanceOf(JobImageError);
  });

  it("lagrer inntil maks antall bilder på et oppdrag", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Bilder på oppdrag",
      description: "Trenger vurdering av skade.",
      category: "elektriker",
      area: "Grünerløkka",
    });
    await saveJobImages(db, job.id, [await pngFile("a.png"), await pngFile("b.png")]);
    const stored = await db.jobImage.findMany({ where: { jobId: job.id } });
    expect(stored).toHaveLength(2);

    const tooMany = await Promise.all(
      Array.from({ length: MAX_JOB_IMAGES + 1 }, (_, index) => pngFile(`${index}.png`)),
    );
    await expect(saveJobImages(db, job.id, tooMany)).rejects.toBeInstanceOf(JobImageError);
  });

  it("viser bilder til bydende og booket utfører uten kontaktlås", async () => {
    const users = await createTestUsers(db);
    const job = await createJob(db, { id: users.customer.id, role: "CUSTOMER" }, {
      title: "Bilder synlige ved bud",
      description: "Utfører må se bildene før tilbud.",
      category: "elektriker",
      area: "Frogner",
    });
    await saveJobImages(db, job.id, [await pngFile("site.png")]);

    const bidding = { id: users.provider.id, role: "PROVIDER" as const };
    const assigned = bidding;
    const other = { id: users.otherProvider.id, role: "PROVIDER" as const };

    await expect(getJobForViewer(db, bidding, job.id)).resolves.toMatchObject({ id: job.id });
    expect(await canViewerSeeContact(db, { viewerId: bidding.id, jobId: job.id })).toBe(false);
    expect(await db.jobImage.count({ where: { jobId: job.id } })).toBe(1);

    const offer = await createOffer(db, bidding, {
      jobId: job.id,
      amountOre: 250_000,
      message: "Kan starte torsdag.",
    });
    await acceptOffer(db, { id: users.customer.id, role: "CUSTOMER" }, offer.id);

    await expect(getJobForViewer(db, assigned, job.id)).resolves.toMatchObject({ id: job.id });
    await expect(getJobForViewer(db, other, job.id)).rejects.toBeInstanceOf(AuthzError);
    expect(await canViewerSeeContact(db, { viewerId: assigned.id, jobId: job.id })).toBe(false);
  });
});
