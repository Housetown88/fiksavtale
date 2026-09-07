import { ContactForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default function ContactPage() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageTitle kicker="Hjelp" title="Kontakt">
        Dette er en enkel melding til eier av nettsiden — ikke et kundesenter eller ticketsystem.
        Vi svarer når vi kan.
      </PageTitle>
      {email ? (
        <p className="text-sm text-ink-soft">
          Du kan også sende e-post direkte til{" "}
          <a className="font-semibold text-moss underline" href={`mailto:${email}`}>
            {email}
          </a>
          .
        </p>
      ) : null}
      <div className="card p-5 sm:p-6">
        <ContactForm />
      </div>
    </div>
  );
}
