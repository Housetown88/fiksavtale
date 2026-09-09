"use client";

import { useMemo, useState } from "react";
import { JOB_IMAGE_TYPE_ERROR, MAX_JOB_IMAGES, jobImageSelectionError } from "@/lib/job-image-limits";

export function JobImagePicker() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const helper = useMemo(
    () => `Maks ${MAX_JOB_IMAGES} bilder, 5 MB hver (JPEG, PNG eller WebP). GPS/EXIF fjernes ved opplasting.`,
    [],
  );

  return (
    <fieldset className="grid gap-2">
      <legend className="label">Bilder</legend>
      <label className="btn btn-secondary w-fit cursor-pointer px-4 py-2">
        Legg til bilder
        <input
          className="sr-only"
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            const selectionError = jobImageSelectionError(files);
            if (selectionError) {
              setError(selectionError);
              event.target.value = "";
              setPreviews([]);
              return;
            }
            setError(null);
            setPreviews(files.map((file) => URL.createObjectURL(file)));
          }}
        />
      </label>
      <p className="text-xs text-ink-soft">{helper}</p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error === JOB_IMAGE_TYPE_ERROR
            ? `${error} PDF, Word og andre filtyper avvises.`
            : error}
        </p>
      ) : null}
      {previews.length > 0 ? (
        <ul className="mt-1 grid grid-cols-3 gap-2">
          {previews.map((src) => (
            <li key={src} className="overflow-hidden rounded-[var(--radius)] border border-line bg-paper-strong">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}

export function JobImageGallery({
  jobId,
  images,
}: {
  jobId: string;
  images: { id: string }[];
}) {
  if (images.length === 0) return null;
  return (
    <section className="card mt-4 p-5">
      <h2 className="font-serif text-xl">Bilder</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <li key={image.id}>
            <a
              className="block overflow-hidden rounded-[var(--radius)] border border-line bg-paper-strong"
              href={`/api/jobs/${jobId}/images/${image.id}?variant=full`}
              target="_blank"
              rel="noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/jobs/${jobId}/images/${image.id}`}
                alt={`Bilde ${index + 1} av oppdraget`}
                className="aspect-[4/3] w-full object-cover"
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
