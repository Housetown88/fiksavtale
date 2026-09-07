import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  if (user.role !== "ADMIN") redirect("/oversikt");
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2 text-sm font-semibold">
        {[
          ["/admin", "Oversikt"],
          ["/admin/brukere", "Brukere"],
          ["/admin/oppdrag", "Oppdrag"],
          ["/admin/betalinger", "Betalinger"],
          ["/admin/gebyr", "Gebyr"],
          ["/admin/rapporter", "Rapporter"],
          ["/admin/kontakt", "Kontakt"],
          ["/admin/logg", "Revisjonslogg"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full bg-sand/80 px-3 py-1.5 text-pine hover:bg-sand"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
