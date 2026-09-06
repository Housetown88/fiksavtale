"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nb">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f6f1e7",
          color: "#1b1914",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <p style={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Jobbenmin
        </p>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.2 }}>Siden kunne ikke lastes</h1>
        <p style={{ maxWidth: "36rem", color: "#4a453c" }}>
          En serverfeil stoppet visningen. Vanlig årsak på Vercel er manglende eller ugyldig DATABASE_URL
          (må være Neon postgresql:// eller Turso libsql://, ikke SQLite-fil).
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1rem",
            border: 0,
            borderRadius: 999,
            background: "#1d3d32",
            color: "#f7f3eb",
            padding: "0.75rem 1.15rem",
            fontWeight: 600,
          }}
        >
          Prøv igjen
        </button>
      </body>
    </html>
  );
}
