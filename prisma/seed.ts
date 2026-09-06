import { createPrisma } from "../src/lib/db";
import { shouldResetSeed } from "../src/lib/database-url";
import { populateDemoData, resetDemoData } from "../src/lib/demo-seed";

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

  console.log("Sådd DEMO-data. Passord for alle kontoer: Demo1234!");
  console.log("  Kunde:  kari@demo.jobbenmin.no");
  console.log("  Kunde:  ola@demo.jobbenmin.no");
  console.log("  Bedrift: bjorn@nordfjell.no (Nordfjell Elektro AS)");
  console.log("  Bedrift: silje@osloror.no (Oslo Rør & Bad AS)");
  console.log("  Admin:  admin@demo.jobbenmin.no");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
