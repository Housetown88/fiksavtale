import { ResetPasswordForm } from "@/components/forms";
import { PageTitle } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <PageTitle kicker="Konto" title="Nytt passord">
        Lim inn eller åpne lenken du fikk. Lenken utløper etter én time.
      </PageTitle>
      <div className="card p-5 sm:p-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-ink-soft">Mangler tilbakestillingslenke. Be om en ny fra glemt passord.</p>
        )}
      </div>
    </div>
  );
}
