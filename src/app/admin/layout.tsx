import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  if (user.role !== "ADMIN") redirect("/oversikt");
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/admin">Oversikt</Link>
        <Link href="/admin/brukere">Brukere</Link>
        <Link href="/admin/oppdrag">Oppdrag</Link>
        <Link href="/admin/betalinger">Betalinger</Link>
        <Link href="/admin/gebyr">Gebyr</Link>
        <Link href="/admin/rapporter">Rapporter</Link>
        <Link href="/admin/logg">Revisjonslogg</Link>
      </nav>
      {children}
    </div>
  );
}
