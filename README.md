# Jobbenmin

Norsk Bokmål-prototype av en tjenestemarkedsplass. Kunder legger ut oppdrag, registrerte bedrifter sender tilbud, partene chatter i appen, og **kontaktopplysninger låses opp først når bookingen er betalt og bekreftet på serveren**.

Tiltenkt merkevare-domene: **jobbenmin.no** (ikke bekreftet som ledig eller registrert i denne prototypen). GitHub-repositoriet heter fortsatt `fiksavtale`.

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

Miljøvariabler: kopier `.env.example` til `.env`. Lokalt peker `DATABASE_URL` på SQLite-filen `prisma/dev.db`.

## Vercel (preview/produksjon)

SQLite-fil virker **ikke** på Vercel serverless. Sett en ekstern database:

1. Opprett **Neon Postgres** (anbefalt) eller **Turso/libSQL**.
2. Kjør skjema mot den eksterne basen (én gang), fra laptop med URL i miljøet:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:push
   ```
   For Turso: `DATABASE_URL="libsql://....turso.io" TURSO_AUTH_TOKEN="..." npm run db:push` (sqlite-skjema + libSQL).
3. Sett miljøvariablene under i Vercel-prosjektet **jobbenmin** (Preview + Production).
4. For DEMO-innhold på preview: sett `SEED_DEMO=1`. Første request mot tom base sår kontoer. **Ikke bruk dette mot ekte produksjonsdata** — det kan opprette demo-brukere, og `SEED_RESET=1` sletter alt.

`prisma generate` kjøres i `postinstall` og `npm run build` (velger sqlite- eller postgres-skjema ut fra `DATABASE_URL`).

### Miljøvariabler som må settes i Vercel

| Variabel | Påkrevd | Eksempel / merknad |
| --- | --- | --- |
| `DATABASE_URL` | Ja | Neon: `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`. Turso: `libsql://DB-ORG.turso.io`. **Ikke** `file:./dev.db`. |
| `TURSO_AUTH_TOKEN` | Bare Turso | Auth-token fra Turso. Alias: `DATABASE_AUTH_TOKEN`. |
| `SESSION_SECRET` | Ja | Lang tilfeldig streng. Alias: `AUTH_SECRET` (samme formål). |
| `AUTH_SECRET` | Nei | Brukes hvis `SESSION_SECRET` mangler. |
| `DEMO_WEBHOOK_SECRET` | Ja | Hemmelighet for signering av DEMO-betalingswebhook. |
| `PLATFORM_FEE_BPS` | Nei | Standard `1000` (10 %). |
| `SEED_DEMO` | Nei (anbefalt på preview) | `1` = så DEMO-data når basen er tom. Risiko: demo-kontoer i feil miljø. |
| `SEED_RESET` | Nei | `1` = tøm basen og så på nytt. **Farlig** mot delt/prod-database. |

Etter deploy: forsiden skal laste uten 500 selv om basen er tom (da vises norsk melding). Med `SEED_DEMO=1` og ferdig `db:push` vises Oslo-oppdrag.

## DEMO-kontoer

## DEMO-kontoer

Passord for alle: `Demo1234!`

| Rolle | E-post | Merknad |
| --- | --- | --- |
| Kunde | `kari@demo.jobbenmin.no` | Åpne oppdrag + booking som venter på betaling |
| Kunde | `ola@demo.jobbenmin.no` | Betalt booking (kontakt låst opp) og fullført jobb med anmeldelse |
| Bedrift | `bjorn@nordfjell.no` | Nordfjell Elektro AS |
| Bedrift | `silje@osloror.no` | Oslo Rør & Bad AS |
| Admin | `admin@demo.jobbenmin.no` | Kontrollpanel og revisjonslogg |

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
