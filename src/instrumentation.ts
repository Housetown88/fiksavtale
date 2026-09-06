export async function register() {
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    if (process.env.SEED_DEMO !== "1") return;
    const { canUseDatabase } = await import("./lib/database-url");
    if (!canUseDatabase().ok) return;
    const { db } = await import("./lib/db");
    const { maybeSeedDemo } = await import("./lib/demo-seed");
    await maybeSeedDemo(db);
  } catch (error) {
    console.error("Jobbenmin instrumentation: hopper over såing", error);
  }
}
