export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SEED_DEMO !== "1") return;
  const { db } = await import("./lib/db");
  const { maybeSeedDemo } = await import("./lib/demo-seed");
  await maybeSeedDemo(db);
}
