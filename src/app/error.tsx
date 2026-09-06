"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-moss">Jobbenmin</p>
      <h1 className="font-serif text-3xl">Noe gikk galt</h1>
      <p className="text-ink-soft">
        Tjenesten fikk ikke lastet siden. På Vercel må DATABASE_URL peke på Neon eller Turso — ikke en
        SQLite-fil. Prøv igjen, eller sjekk miljøvariablene.
      </p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Prøv igjen
      </button>
    </div>
  );
}
