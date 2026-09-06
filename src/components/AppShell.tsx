import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { logoutAction } from "@/app/actions";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line bg-pine text-paper">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs sm:text-sm">
          DEMO-prototype — ikke en ekte betalings- eller verifiseringstjeneste. Ingen midler holdes i depot.
        </p>
      </div>
      <header className="border-b border-line/80 bg-paper-strong/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pine font-serif text-sm text-paper">
              F
            </span>
            <span className="font-serif text-xl tracking-tight">Fiksavtale</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            <Link href="/oppdrag">Finn oppdrag</Link>
            {user?.role === "CUSTOMER" ? <Link href="/oppdrag/nytt">Nytt oppdrag</Link> : null}
            {user ? <Link href="/oversikt">Oversikt</Link> : null}
            {user ? <Link href="/samtaler">Samtaler</Link> : null}
            {user?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <Link href="/konto" className="hidden sm:inline">
                  {user.name}
                </Link>
                <form action={logoutAction}>
                  <button className="btn btn-secondary px-3 py-2 text-sm" type="submit">
                    Logg ut
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/logg-inn" className="btn btn-secondary px-3 py-2 text-sm">
                  Logg inn
                </Link>
                <Link href="/registrer" className="btn btn-primary px-3 py-2 text-sm">
                  Registrer
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">{children}</main>
      <footer className="border-t border-line bg-paper-strong">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm text-ink-soft md:grid-cols-3">
          <div>
            <p className="font-serif text-lg text-ink">Fiksavtale</p>
            <p className="mt-2 max-w-xs">
              Arbeidstittel for en norsk tjenestemarkedsplass. Forretningsidentitet vises tidlig; direkte kontakt
              først etter betalt booking.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/vilkar">Vilkår (utkast)</Link>
            <Link href="/personvern">Personvern (utkast)</Link>
            <Link href="/avbestilling">Avbestilling og reklamasjon</Link>
            <Link href="/verifisering">Hva merket «Org.nr sjekket» betyr</Link>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/milepaeler">Milepælsbetaling (planlagt)</Link>
            <Link href="/befaring">Befaring (planlagt)</Link>
            <p className="mt-2">GDPR og forbrukerrett: avklar med advokat før produksjon.</p>
          </div>
        </div>
      </footer>
      {user ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-paper-strong text-center text-xs md:hidden">
          <Link className="py-3" href="/oppdrag">
            Oppdrag
          </Link>
          <Link className="py-3" href="/oversikt">
            Oversikt
          </Link>
          <Link className="py-3" href="/samtaler">
            Samtaler
          </Link>
          <Link className="py-3" href={user.role === "ADMIN" ? "/admin" : "/konto"}>
            {user.role === "ADMIN" ? "Admin" : "Konto"}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
