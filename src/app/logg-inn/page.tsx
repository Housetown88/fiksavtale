import Link from "next/link";
import { LoginForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { allowDemoHints, WEAK_DEMO_PASSWORD } from "@/lib/demo-mode";

export default function LoginPage() {
  const showHints = allowDemoHints();
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Logg inn">
        {showHints ? (
          <>
            DEMO-passord for testkontoer er <strong>{WEAK_DEMO_PASSWORD}</strong>. Dette vises bare når
            ALLOW_DEMO_HINTS eller DEMO er slått på (eller utenfor produksjon).
          </>
        ) : (
          "Logg inn med e-post og passord. Glemt passord? Bruk lenken under skjemaet."
        )}
      </PageTitle>
      <div className="card p-5 sm:p-6">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Ny her?{" "}
        <Link href="/registrer" className="font-semibold text-moss hover:underline">
          Opprett konto
        </Link>
      </p>
    </div>
  );
}
