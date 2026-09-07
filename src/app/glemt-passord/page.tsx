import { ForgotPasswordForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Glemt passord">
        E-postutsendelse er ikke koblet ennå. Vi lagrer en tilbakestillingslenke, men i produksjon må du
        kontakte eier via /kontakt til e-post er på plass. I DEMO kan lenken vises på neste skjerm.
      </PageTitle>
      <div className="card p-5 sm:p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
