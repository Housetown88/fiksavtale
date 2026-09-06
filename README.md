# Fiksavtale

Norsk Bokmål-prototype av en tjenestemarkedsplass (arbeidstittel). Kunder legger ut oppdrag, registrerte bedrifter sender tilbud, partene chatter i appen, og **kontaktopplysninger låses opp først når bookingen er betalt og bekreftet på serveren**.

Dette er **ikke** en kopi av Mittanbud. Merkevare, språk og flyt er egne.

## Kom i gang

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

Tester:

```bash
npm test
```

Miljøvariabler: kopier `.env.example` til `.env`. `DATABASE_URL` peker på SQLite-filen `prisma/dev.db`.

## DEMO-kontoer

Passord for alle: `Demo1234!`

| Rolle | E-post | Merknad |
| --- | --- | --- |
| Kunde | `kari@demo.fiksavtale.no` | Åpne oppdrag + booking som venter på betaling |
| Kunde | `ola@demo.fiksavtale.no` | Betalt booking (kontakt låst opp) og fullført jobb med anmeldelse |
| Bedrift | `bjorn@nordfjell.no` | Nordfjell Elektro AS |
| Bedrift | `silje@osloror.no` | Oslo Rør & Bad AS |
| Admin | `admin@fiksavtale.no` | Kontrollpanel og revisjonslogg |

## Forretningsmodell

- Gratis å registrere, legge ut oppdrag og gi tilbud.
- Plattformen tar et konfigurerbart gebyr (`platformFeeBps`, standard **1000 = 10 %**) bare av **betalte** jobber.
- Eksempel: 5 000 NOK jobb → 500 NOK til plattformen, 4 500 NOK til bedriften.

**Antakelser (ikke regnskapssannhet):**

- Beløp er inkl. avtalt fastpris, lagret i øre.
- Kortgebyr, utbetalingsgebyr og MVA er **ikke** beregnet.
- Plattformen holder **ikke** kundens penger i depot (ingen escrow).
- DEMO-betalingsleverandøren simulerer `create payment intent` → webhook `payment.succeeded` → opplåsing.

## Betaling (DEMO)

1. Kunden godtar et tilbud → booking `PENDING_PAYMENT`.
2. «Start DEMO-betaling» lager en betalingsintensjon og sender deg til en bekreftelsesside.
3. Bekreftelsessiden **låser ikke opp kontakt**.
4. Først når en signert webhook `payment.succeeded` behandles på serveren, settes `contactUnlockedAt`.
5. `payment.failed` / `payment.cancelled` låser ikke opp. Samme `eventId` gir idempotent svar.

Ekte Stripe Connect, PSD2 og utbetalingsoppsett må verifiseres med advokat og betalingspartner før produksjon.

## Sikkerhet i MVP

- Kontakt (telefon, e-post, eksakt adresse) kommer aldri med i offentlige API-svar.
- `GET /api/jobs/[id]/contact` krever innlogget part **og** serverbekreftet betaling.
- Tilbud og meldinger er isolert mellom partene.
- Tekstfilter stopper telefon, e-post og URL-er. Vennlig norsk feilmelding; brukeren kan rette teksten (også ved falske positiver).
- Vedlegg er slått av i v1.

## Juridiske forbehold

Tekst om vilkår, personvern, avbestilling og merker er **produktutkast**, ikke juridiske fakta. Avklar GDPR, forbrukerrett, håndverkertjenester og betalingsregulering med advokat. Forretningsidentitet vises tidlig; direkte kontakt og gateadresse først etter betalt booking.

Merket **«Org.nr sjekket»** betyr format + kontrollsiffer i DEMO. Det er ikke et oppslag i Brønnøysund eller faglig godkjenning.

## Hva som ikke er ferdig

- Ekte betaling, KYC, BankID og Brønnøysund-oppslag
- Escrow / holding av kundemidler
- Milepælsbetaling og befaring (egne stubsider)
- Betalingsløp for godkjente tillegg
- Automatisk refusjon og tvistenemnd
- GDPR-innsyn/sletting, e-postvarsler, filvedlegg
- Produksjonshosting, rate limiting og pentest

Se [ARCHITECTURE.md](./ARCHITECTURE.md) for sider, datamodell og tilstandsmaskin.
