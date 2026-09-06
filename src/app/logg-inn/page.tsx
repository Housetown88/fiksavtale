import Link from "next/link";
import { LoginForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Logg inn">
        DEMO-passord for såkornkontoer er <strong>Demo1234!</strong>
      </PageTitle>
      <div className="card p-5">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm">
        Ny her? <Link href="/registrer" className="font-semibold text-moss">Opprett konto</Link>
      </p>
    </div>
  );
}
