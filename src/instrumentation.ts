export async function register() {
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const { canUseDatabase } = await import("./lib/database-url");
    if (!canUseDatabase().ok) return;
    const { db } = await import("./lib/db");
    const { maybeBootstrapAdmin, maybeSeedDemo } = await import("./lib/demo-seed");
    await maybeBootstrapAdmin(db);
    if (process.env.SEED_DEMO === "1") {
      await maybeSeedDemo(db);
    }
  } catch (error) {
    console.error("Jobbenmin instrumentation: hopper over såing", error);
  }
}
