import { execSync } from "node:child_process";
import { schemaPath } from "./prisma-env.mjs";

const schema = schemaPath();
const extra = process.argv.slice(2).join(" ");
console.log(`prisma db push --schema=${schema} ${extra}`.trim());
execSync(`npx prisma db push --schema=${schema} ${extra}`.trim(), { stdio: "inherit" });
