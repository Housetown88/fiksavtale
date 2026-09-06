import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-serif text-4xl">Siden finnes ikke</h1>
      <p className="mt-3 text-ink-soft">Sjekk adressen, eller gå tilbake til forsiden.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Til Jobbenmin
      </Link>
    </div>
  );
}
