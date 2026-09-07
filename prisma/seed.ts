import { createPrisma } from "../src/lib/db";
import { shouldResetSeed } from "../src/lib/database-url";
import { maybeBootstrapAdmin, populateDemoData, resetDemoData } from "../src/lib/demo-seed";
import { adminDemoAllowed, allowDemoHints, WEAK_DEMO_PASSWORD } from "../src/lib/demo-mode";

const db = createPrisma();

async function main() {
  if (shouldResetSeed()) {
    await resetDemoData(db);
    await populateDemoData(db);
  } else {
    const existing = await db.user.count();
    if (existing > 0) {
      console.log("Databasen har allerede brukere. Hopper over såing (sett SEED_RESET=1 for å tømme).");
      return;
    }
    await populateDemoData(db);
  }

  await maybeBootstrapAdmin(db);

  if (allowDemoHints()) {
    console.log(`Sådd DEMO-data. Delt passord for såkornkontoer: ${WEAK_DEMO_PASSWORD}`);
    console.log("  Kunde:  kari@demo.jobbenmin.no");
    console.log("  Kunde:  ola@demo.jobbenmin.no");
    console.log("  Bedrift: bjorn@nordfjell.no (Nordfjell Elektro AS)");
    console.log("  Bedrift: silje@osloror.no (Oslo Rør & Bad AS)");
    if (adminDemoAllowed()) {
      console.log("  Admin:  admin@demo.jobbenmin.no (slå av i produksjon: ikke sett ADMIN_DEMO_ALLOWED)");
    } else {
      console.log("  Admin@demo ble ikke sådd (produksjon uten ADMIN_DEMO_ALLOWED=1).");
    }
  } else {
    console.log("Sådd DEMO-data. Passord vises ikke (ALLOW_DEMO_HINTS er av).");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
