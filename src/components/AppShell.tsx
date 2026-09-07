import Image from "next/image";
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
  const isProvider = user?.role === "PROVIDER";
  const showPostJob = !isProvider;

  return (
    <div className="flex min-h-full flex-col">
      <div className="bg-pine text-paper">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs sm:text-sm">
          DEMO — ingen ekte Vipps-trekk. Jobbenmin er ikke bank og oppbevarer ikke oppdragspenger.
        </p>
      </div>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper-strong/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            <Image
              src="/brand/jobbenmin-logo.png"
              alt="Jobbenmin"
              width={157}
              height={40}
              priority
              unoptimized
              className="h-10 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link href="/oppdrag" className="nav-link">
              Finn oppdrag
            </Link>
            {user ? (
              <Link href="/oversikt" className="nav-link">
                Oversikt
              </Link>
            ) : null}
            {user ? (
              <Link href="/samtaler" className="nav-link">
                Samtaler
              </Link>
            ) : null}
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="nav-link">
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {showPostJob ? (
              <Link href="/oppdrag/nytt" className="btn btn-copper btn-sm sm:min-h-11 sm:px-4">
                Legg ut jobb
              </Link>
            ) : null}
            {user ? (
              <>
                <Link href="/konto" className="hidden text-ink-soft hover:text-ink sm:inline">
                  {user.name}
                </Link>
                <form action={logoutAction}>
                  <button className="btn btn-secondary btn-sm" type="submit">
                    Logg ut
                  </button>
                </form>
              </>
            ) : (
              <Link href="/logg-inn" className="btn btn-secondary btn-sm">
                Logg inn
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">{children}</main>
      <footer className="border-t border-line bg-paper-strong">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft md:grid-cols-3">
          <div>
            <p className="font-serif text-lg text-ink">Jobbenmin</p>
            <p className="mt-2 max-w-xs">
              Norsk markedsplass for tjenester. Legg ut jobben, motta tilbud, og del kontakt først
              etter betalt booking.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/vilkar" className="hover:text-ink">
              Vilkår (utkast)
            </Link>
            <Link href="/personvern" className="hover:text-ink">
              Personvern (utkast)
            </Link>
            <Link href="/avbestilling" className="hover:text-ink">
              Avbestilling og reklamasjon
            </Link>
            <Link href="/verifisering" className="hover:text-ink">
              Hva merket «Org.nr sjekket» betyr
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/milepaeler" className="hover:text-ink">
              Milepælsbetaling (planlagt)
            </Link>
            <Link href="/befaring" className="hover:text-ink">
              Befaring (planlagt)
            </Link>
            <p className="mt-2">GDPR og forbrukerrett: avklar med advokat før produksjon.</p>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-paper-strong text-center text-xs font-semibold md:hidden">
        {user ? (
          <div className="grid grid-cols-4">
            <Link className="tap-target py-3" href="/oppdrag">
              Oppdrag
            </Link>
            {showPostJob ? (
              <Link className="tap-target py-3 text-copper" href="/oppdrag/nytt">
                Legg ut
              </Link>
            ) : (
              <Link className="tap-target py-3" href="/oversikt">
                Oversikt
              </Link>
            )}
            <Link className="tap-target py-3" href="/samtaler">
              Samtaler
            </Link>
            <Link className="tap-target py-3" href={user.role === "ADMIN" ? "/admin" : "/konto"}>
              {user.role === "ADMIN" ? "Admin" : "Konto"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3">
            <Link className="tap-target py-3" href="/oppdrag">
              Oppdrag
            </Link>
            <Link className="tap-target py-3 text-copper" href="/oppdrag/nytt">
              Legg ut
            </Link>
            <Link className="tap-target py-3" href="/logg-inn">
              Logg inn
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
