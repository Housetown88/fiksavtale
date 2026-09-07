import Link from "next/link";
import { LoginForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Logg inn">
        DEMO-passord for såkornkontoer er <strong>Demo1234!</strong>
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
