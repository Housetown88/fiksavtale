import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/session";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jobbenmin — avtale først, kontakt etter betaling",
  description:
    "Norsk markedsplass for tjenester. Kunder legger ut oppdrag, bedrifter gir tilbud, og kontakt låses opp først når betaling er bekreftet.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

// Alltid dynamisk: ellers prerendrer `next build` på Vercel sider som treffer Prisma
// når DATABASE_URL mangler eller er fil-SQLite.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  return (
    <html lang="nb" className={`${figtree.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
