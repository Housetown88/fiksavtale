import Link from "next/link";
import { JOB_CATEGORIES, type CategorySlug } from "@/lib/categories";

function CategoryIcon({ slug }: { slug: CategorySlug }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (slug) {
    case "rorlegger":
      return (
        <svg {...common}>
          <path d="M4 14h7l2-4h7" />
          <path d="M15 10v8a2 2 0 0 0 2 2h1" />
          <path d="M4 10v8a2 2 0 0 0 2 2h1" />
          <circle cx="7" cy="8" r="2" />
        </svg>
      );
    case "elektriker":
      return (
        <svg {...common}>
          <path d="M13 2 6 13h6l-1 9 7-11h-6l1-9Z" />
        </svg>
      );
    case "snekker":
      return (
        <svg {...common}>
          <path d="m14 5 6 6-8 8H6v-6l8-8Z" />
          <path d="m12 7 5 5" />
        </svg>
      );
    case "maling":
      return (
        <svg {...common}>
          <path d="M5 14c0 2.8 2.2 5 5 5h1a3 3 0 0 0 0-6H8" />
          <path d="M8 13V6.5A2.5 2.5 0 0 1 10.5 4h.2c.8 0 1.5.4 1.9 1.1L19 14" />
        </svg>
      );
    case "renhold":
      return (
        <svg {...common}>
          <path d="M5 20h14" />
          <path d="M8 20 9.5 8h5L16 20" />
          <path d="M10 8c0-2 1-4 2-5 1 1 2 3 2 5" />
        </svg>
      );
    case "hage":
      return (
        <svg {...common}>
          <path d="M12 21V10" />
          <path d="M12 14c-4 0-6-3-6-6 4 0 6 3 6 6Z" />
          <path d="M12 12c4 0 6-3 6-6-4 0-6 3-6 6Z" />
        </svg>
      );
    case "flytting":
      return (
        <svg {...common}>
          <path d="M3 8h12v11H3z" />
          <path d="M15 12h3l3 3v4h-6" />
          <circle cx="7" cy="20.5" r="1.5" />
          <circle cx="18" cy="20.5" r="1.5" />
        </svg>
      );
    case "data":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
        </svg>
      );
    default:
      return null;
  }
}

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {JOB_CATEGORIES.map((item) => (
        <Link
          key={item.slug}
          href={`/oppdrag?category=${item.slug}`}
          className="card card-link flex min-h-[5.5rem] flex-col items-start justify-center gap-2 p-4"
        >
          <span className="text-pine">
            <CategoryIcon slug={item.slug} />
          </span>
          <span className="text-sm font-semibold">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
