import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fil-SQLite virker ikke på Vercel. Preview/prod bruker DATABASE_URL (Neon/Turso).
};

export default nextConfig;
