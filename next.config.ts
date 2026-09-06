import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack (Vercel kan bruke dette i stedet for Turbopack) må ikke parse
  // Turso/libSQL-pakkene — de trekker inn README/LICENSE og krasjer bygget.
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@libsql/isomorphic-ws",
    "@libsql/hrana-client",
    "libsql",
    "sharp",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
