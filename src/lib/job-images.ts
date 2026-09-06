import type { PrismaClient } from "@prisma/client";
import sharp from "sharp";

export const MAX_JOB_IMAGES = 6;
export const MAX_JOB_IMAGE_BYTES = 5 * 1024 * 1024;
export const JOB_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: "RIFF",
} as const;

export class JobImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobImageError";
  }
}

function looksLikeSupportedImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] === MAGIC.jpeg[0] && buffer[1] === MAGIC.jpeg[1] && buffer[2] === MAGIC.jpeg[2]) {
    return true;
  }
  if (
    buffer[0] === MAGIC.png[0] &&
    buffer[1] === MAGIC.png[1] &&
    buffer[2] === MAGIC.png[2] &&
    buffer[3] === MAGIC.png[3]
  ) {
    return true;
  }
  return buffer.toString("ascii", 0, 4) === MAGIC.webp && buffer.toString("ascii", 8, 12) === "WEBP";
}

export async function processJobImage(input: Buffer): Promise<{
  data: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  mimeType: "image/jpeg";
  sizeBytes: number;
}> {
  if (!looksLikeSupportedImage(input)) {
    throw new JobImageError("Bare JPEG, PNG og WebP er tillatt.");
  }
  if (input.length > MAX_JOB_IMAGE_BYTES) {
    throw new JobImageError(`Hvert bilde kan være maks ${MAX_JOB_IMAGE_BYTES / (1024 * 1024)} MB.`);
  }

  // rotate() respekterer EXIF-orientering; jpeg-utdata uten metadata fjerner GPS m.m.
  const pipeline = sharp(input, { failOn: "error" }).rotate().resize(1600, 1600, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const data = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  const meta = await sharp(data).metadata();
  const thumb = await sharp(data)
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();

  return {
    data,
    thumb,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    mimeType: "image/jpeg",
    sizeBytes: data.length,
  };
}

export function collectJobImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function saveJobImages(db: PrismaClient, jobId: string, files: File[]) {
  if (files.length > MAX_JOB_IMAGES) {
    throw new JobImageError(`Maks ${MAX_JOB_IMAGES} bilder per oppdrag.`);
  }
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_JOB_IMAGE_BYTES) {
      throw new JobImageError(`Hvert bilde kan være maks ${MAX_JOB_IMAGE_BYTES / (1024 * 1024)} MB.`);
    }
    if (!JOB_IMAGE_TYPES.includes(file.type as (typeof JOB_IMAGE_TYPES)[number])) {
      throw new JobImageError("Bare JPEG, PNG og WebP er tillatt.");
    }
    const processed = await processJobImage(Buffer.from(await file.arrayBuffer()));
    await db.jobImage.create({
      data: {
        jobId,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.sizeBytes,
        data: processed.data,
        thumb: processed.thumb,
        sortOrder: index,
      },
    });
  }
}

export async function createDemoJobImage(
  label: string,
  background: { r: number; g: number; b: number },
) {
  const overlay = Buffer.from(
    `<svg width="800" height="560" xmlns="http://www.w3.org/2000/svg">
      <text x="40" y="290" font-size="34" font-family="sans-serif" fill="#f7f3eb">${escapeXml(label)}</text>
    </svg>`,
  );
  const jpeg = await sharp({
    create: { width: 800, height: 560, channels: 3, background },
  })
    .composite([{ input: overlay }])
    .jpeg({ quality: 80 })
    .toBuffer();
  return processJobImage(jpeg);
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
