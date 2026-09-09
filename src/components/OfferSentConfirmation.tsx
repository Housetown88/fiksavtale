"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function OfferSentConfirmation({
  jobTitle,
  amountLabel,
  sentAtLabel,
  jobHref,
}: {
  jobTitle: string;
  amountLabel: string;
  sentAtLabel: string;
  jobHref: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const detailsHref = `${jobHref}#mitt-tilbud`;

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (!node.open) node.showModal();

    const onCancel = (event: Event) => {
      event.preventDefault();
      router.replace(jobHref, { scroll: false });
    };
    node.addEventListener("cancel", onCancel);
    return () => node.removeEventListener("cancel", onCancel);
  }, [jobHref, router]);

  return (
    <dialog
      ref={dialogRef}
      className="offer-success-dialog"
      aria-labelledby="offer-sent-title"
      aria-describedby="offer-sent-sub"
    >
      <div className="card px-5 py-7 sm:px-8 sm:py-8">
        <div className="offer-check-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok/10 text-ok sm:h-20 sm:w-20">
          <svg viewBox="0 0 48 48" className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 25.5 20 33.5 36 15.5"
            />
          </svg>
        </div>
        <h1
          id="offer-sent-title"
          tabIndex={-1}
          className="mt-5 text-center font-serif text-3xl tracking-tight text-ink sm:text-4xl"
        >
          Tilbudet er sendt!
        </h1>
        <p id="offer-sent-sub" className="mt-3 text-center text-sm leading-relaxed text-ink-soft sm:text-base">
          Kunden har mottatt tilbudet ditt. Du får beskjed dersom kunden svarer eller velger
          tilbudet.
        </p>
        <dl className="mt-6 space-y-2 rounded-[var(--radius)] bg-sand/60 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Oppdrag</dt>
            <dd className="text-right font-semibold">{jobTitle}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Ditt tilbud</dt>
            <dd className="text-right font-semibold">{amountLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Sendt</dt>
            <dd className="text-right font-semibold">{sentAtLabel}</dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-2">
          <Link href={detailsHref} className="btn btn-primary">
            Se tilbudet mitt
          </Link>
          <Link href={jobHref} className="btn btn-secondary">
            Tilbake til oppdrag
          </Link>
        </div>
      </div>
    </dialog>
  );
}
