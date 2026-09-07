import { RegisterForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageTitle kicker="Konto" title="Registrer deg">
        Kunder kan legge ut oppdrag. Bedrifter må være registrert næringsvirksomhet med org.nr. Merket
        «Org.nr format OK» betyr formatkontroll i DEMO — ikke oppslag i Brønnøysund.
      </PageTitle>
      <div className="card p-5 sm:p-6">
        <RegisterForm />
      </div>
    </div>
  );
}
