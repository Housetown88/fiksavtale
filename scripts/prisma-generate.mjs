import { execSync } from "node:child_process";
import { databaseUrl, schemaPath } from "./prisma-env.mjs";

const schema = schemaPath();
const protocol = (databaseUrl().split(":")[0] || "(missing)").toLowerCase();
console.log(`prisma generate --schema=${schema} (DATABASE_URL protocol: ${protocol})`);
if (process.env.NODE_ENV === "development" && process.env.VERCEL) {
  console.warn("Advarsel: NODE_ENV=development på Vercel kan knakke next build. Ikke sett NODE_ENV i Vercel.");
}
execSync(`npx prisma generate --schema=${schema}`, { stdio: "inherit" });
