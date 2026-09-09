"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <p className="kicker">Jobbenmin</p>
      <h1 className="font-serif text-3xl">Noe gikk galt</h1>
      <p className="text-ink-soft">Tjenesten fikk ikke lastet siden. Prøv igjen om litt.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Prøv igjen
      </button>
    </div>
  );
}
