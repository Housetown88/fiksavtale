import { ForgotPasswordForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { passwordResetEmailConfigured } from "@/lib/email";

export default function ForgotPasswordPage() {
  const configured = passwordResetEmailConfigured();
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Glemt passord">
        Oppgi e-postadressen din. Hvis kontoen finnes, sender vi en engangslenke som utløper etter én
        time. Vi sier ikke om adressen er registrert.
        {!configured ? (
          <span className="mt-2 block text-sm text-ink-soft">
            E-postutsending venter på RESEND_API_KEY og EMAIL_FROM. Inntil det er satt, lagres tokenet
            på serveren uten at e-post sendes.
          </span>
        ) : null}
      </PageTitle>
      <div className="card p-5 sm:p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
