export const MAX_JOB_IMAGES = 6;
export const MAX_JOB_IMAGE_BYTES = 5 * 1024 * 1024;
export const JOB_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const JOB_IMAGE_TYPE_ERROR = "Bare JPEG, PNG og WebP er tillatt.";

const ALLOWED_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export function isAllowedJobImageFile(file: { name: string; type: string }): boolean {
  if ((JOB_IMAGE_TYPES as readonly string[]).includes(file.type)) return true;
  if (file.type) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_IMAGE_EXT.has(ext);
}

export function jobImageSelectionError(
  files: { name: string; type: string; size: number }[],
): string | null {
  if (files.length > MAX_JOB_IMAGES) {
    return `Maks ${MAX_JOB_IMAGES} bilder.`;
  }
  if (files.some((file) => !isAllowedJobImageFile(file))) {
    return JOB_IMAGE_TYPE_ERROR;
  }
  if (files.some((file) => file.size > MAX_JOB_IMAGE_BYTES)) {
    return `Hvert bilde kan være maks ${MAX_JOB_IMAGE_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}
