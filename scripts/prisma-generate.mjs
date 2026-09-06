import { execSync } from "node:child_process";
import { schemaPath } from "./prisma-env.mjs";

const schema = schemaPath();
console.log(`prisma generate --schema=${schema}`);
execSync(`npx prisma generate --schema=${schema}`, { stdio: "inherit" });
