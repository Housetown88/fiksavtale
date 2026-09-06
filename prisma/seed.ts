import { PrismaClient } from "@prisma/client";
import {
  acceptOffer,
  completeBooking,
  createJob,
  createOffer,
  createReview,
  hashPassword,
  markWorkStarted,
  sendMessage,
} from "../src/lib/domain";
import { createPaymentIntent, handlePaymentWebhook } from "../src/lib/payments";
import { orgNumberWithChecksum } from "../src/lib/orgnr";

const db = new PrismaClient();

async function main() {
  await db.payment.deleteMany();
  await db.paymentIntent.deleteMany();
  await db.review.deleteMany();
  await db.extraCharge.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.booking.deleteMany();
  await db.offer.deleteMany();
  await db.report.deleteMany();
  await db.auditLog.deleteMany();
  await db.job.deleteMany();
  await db.session.deleteMany();
  await db.customerProfile.deleteMany();
  await db.providerProfile.deleteMany();
  await db.user.deleteMany();
  await db.platformSettings.deleteMany();

  await db.platformSettings.create({
    data: { id: "default", platformFeeBps: 1000 },
  });

  const password = await hashPassword("Demo1234!");

  const kari = await db.user.create({
    data: {
      email: "kari@demo.fiksavtale.no",
      passwordHash: password,
      name: "Kari Nordmann",
      phone: "40011223",
      role: "CUSTOMER",
      customerProfile: {
        create: {
          addressLine: "Markveien 35B",
          postalCode: "0554",
          city: "Oslo",
          area: "Grünerløkka",
        },
      },
    },
  });

  const ola = await db.user.create({
    data: {
      email: "ola@demo.fiksavtale.no",
      passwordHash: password,
      name: "Ola Hansen",
      phone: "40022334",
      role: "CUSTOMER",
      customerProfile: {
        create: {
          addressLine: "Bygdøy allé 21",
          postalCode: "0262",
          city: "Oslo",
          area: "Frogner",
        },
      },
    },
  });

  const bjorn = await db.user.create({
    data: {
      email: "bjorn@nordfjell.no",
      passwordHash: password,
      name: "Bjørn Holm",
      phone: "90011223",
      role: "PROVIDER",
      providerProfile: {
        create: {
          companyName: "Nordfjell Elektro AS",
          orgNumber: orgNumberWithChecksum("91827364"),
          orgVerified: true,
          about:
            "Autorisert elektroforetak med base på Tøyen. Vi tar mindre jobb i Oslo vest og sentrum. DEMO-firma.",
          serviceAreas: "Grünerløkka, Tøyen, Majorstuen, Sagene",
          invoiceEmail: "faktura@nordfjell.no",
        },
      },
    },
  });

  const silje = await db.user.create({
    data: {
      email: "silje@osloror.no",
      passwordHash: password,
      name: "Silje Berg",
      phone: "90022334",
      role: "PROVIDER",
      providerProfile: {
        create: {
          companyName: "Oslo Rør & Bad AS",
          orgNumber: orgNumberWithChecksum("82910473"),
          orgVerified: true,
          about: "Rørleggerbedrift i Oslo. Bad, kjøkken og lekkasjer. DEMO-firma.",
          serviceAreas: "Frogner, Majorstuen, Ullern, St. Hanshaugen",
          invoiceEmail: "faktura@osloror.no",
        },
      },
    },
  });

  await db.user.create({
    data: {
      email: "admin@fiksavtale.no",
      passwordHash: password,
      name: "Fiksavtale admin",
      role: "ADMIN",
    },
  });

  const viewer = (user: { id: string; role: "CUSTOMER" | "PROVIDER" | "ADMIN" }) => user;

  const openJob = await createJob(db, viewer(kari), {
    title: "Bytte sikringsskap i leilighet på Grünerløkka",
    description:
      "Sikringsskapet er fra 70-tallet og slår ut når ovn og vaskemaskin går samtidig. Ønsker vurdering og bytte til moderne skap. Oppdraget er åpent for tilbud.",
    category: "elektriker",
    area: "Grünerløkka",
    postalCode: "0554",
    addressLine: "Markveien 35B",
    budgetMinOre: 400_000,
    budgetMaxOre: 700_000,
  });

  const pendingPayJob = await createJob(db, viewer(kari), {
    title: "Tett sluk på bad, Majorstuen",
    description:
      "Sluket på badet renner tregt og det lukter. Trenger rørlegger denne uken. Jeg har allerede valgt et tilbud og venter på betaling.",
    category: "rorlegger",
    area: "Majorstuen",
    postalCode: "0363",
    addressLine: "Valkyriegata 9",
    budgetMinOre: 150_000,
    budgetMaxOre: 300_000,
  });

  const paidJob = await createJob(db, viewer(ola), {
    title: "Nye stikkontakter i stue på Frogner",
    description:
      "Ønsker to nye stikkontakter bak TV-benken. Betalt booking i DEMO — kontakt skal være synlig for partene.",
    category: "elektriker",
    area: "Frogner",
    postalCode: "0262",
    addressLine: "Bygdøy allé 21",
    budgetMinOre: 200_000,
    budgetMaxOre: 350_000,
  });

  const completedJob = await createJob(db, viewer(ola), {
    title: "Male stue 24 m² på St. Hanshaugen",
    description: "To strøk hvit veggmaling, tapet fjernes ikke. Fullført DEMO-oppdrag med anmeldelse.",
    category: "maling",
    area: "St. Hanshaugen",
    postalCode: "0166",
    addressLine: "Ullevålsveien 44",
    budgetMinOre: 600_000,
    budgetMaxOre: 900_000,
  });

  await createJob(db, viewer(ola), {
    title: "Klippe hekk og rydde gårdsplass på Sagene",
    description: "Hekk mot gaten er blitt for høy. Ønsker klipp og bortkjøring av avfall.",
    category: "hage",
    area: "Sagene",
    postalCode: "0473",
    addressLine: "Arendalsgata 6",
    budgetMinOre: 200_000,
    budgetMaxOre: 400_000,
  });

  const openOffer = await createOffer(db, viewer(bjorn), {
    jobId: openJob.id,
    amountOre: 580_000,
    message:
      "Vi kan bytte til et 3-rads skap og dokumentere anlegget. Inkluderer materiell, ikke eventuelle veggåpninger.",
  });
  await sendMessage(db, viewer(kari), {
    conversationId: (await db.conversation.findFirstOrThrow({ where: { offerId: openOffer.id } })).id,
    body: "Takk for tilbudet. Kan dere komme på dagtid onsdag eller torsdag?",
  });
  await sendMessage(db, viewer(bjorn), {
    conversationId: (await db.conversation.findFirstOrThrow({ where: { offerId: openOffer.id } })).id,
    body: "Torsdag formiddag passer. Vi tar med måleinstrument og gir en kort status før vi starter.",
  });

  const pendingOffer = await createOffer(db, viewer(silje), {
    jobId: pendingPayJob.id,
    amountOre: 220_000,
    message: "Spyling og kontroll av sluk. Fastpris hvis det ikke er brudd i rør.",
  });
  const pendingBooking = await acceptOffer(db, viewer(kari), pendingOffer.id);
  await createPaymentIntent(db, pendingBooking.id);

  const paidOffer = await createOffer(db, viewer(bjorn), {
    jobId: paidJob.id,
    amountOre: 280_000,
    message: "To nye punkter fra eksisterende kurs. Ryddig arbeid og opprydding.",
  });
  const paidBooking = await acceptOffer(db, viewer(ola), paidOffer.id);
  const paidIntent = await createPaymentIntent(db, paidBooking.id);
  await handlePaymentWebhook(db, {
    eventId: "seed_paid_1",
    type: "payment.succeeded",
    paymentIntentId: paidIntent.id,
    bookingId: paidBooking.id,
  });

  const doneOffer = await createOffer(db, viewer(silje), {
    jobId: completedJob.id,
    amountOre: 750_000,
    message: "Inkluderer sparkel, to strøk og tildekking av gulv.",
  });
  const doneBooking = await acceptOffer(db, viewer(ola), doneOffer.id);
  const doneIntent = await createPaymentIntent(db, doneBooking.id);
  await handlePaymentWebhook(db, {
    eventId: "seed_done_1",
    type: "payment.succeeded",
    paymentIntentId: doneIntent.id,
    bookingId: doneBooking.id,
  });
  await markWorkStarted(db, viewer(silje), doneBooking.id);
  await completeBooking(db, viewer(ola), doneBooking.id);
  await createReview(db, viewer(ola), {
    bookingId: doneBooking.id,
    rating: 5,
    comment: "Punktlig, ryddig og pent resultat. Anbefales.",
  });

  await db.report.create({
    data: {
      reporterId: kari.id,
      targetJobId: openJob.id,
      reason: "TEST: eksempelrapport",
      details: "Dette er en såkorn-rapport så adminpanelet ikke er tomt.",
    },
  });

  console.log("Sådd DEMO-data. Passord for alle kontoer: Demo1234!");
  console.log("  Kunde:  kari@demo.fiksavtale.no");
  console.log("  Kunde:  ola@demo.fiksavtale.no");
  console.log("  Bedrift: bjorn@nordfjell.no (Nordfjell Elektro AS)");
  console.log("  Bedrift: silje@osloror.no (Oslo Rør & Bad AS)");
  console.log("  Admin:  admin@fiksavtale.no");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
