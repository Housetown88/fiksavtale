# Jobbenmin

Norsk Bokmål-prototype av en tjenestemarkedsplass. Kunder legger ut oppdrag, registrerte bedrifter sender tilbud, partene chatter i appen, og **kontaktopplysninger låses opp først når bookingen er betalt og bekreftet på serveren**.

Tiltenkt merkevare-domene: **jobbenmin.no** (ikke bekreftet som ledig eller registrert i denne prototypen). GitHub-repositoriet heter fortsatt `fiksavtale`.

Dette er **ikke** en kopi av Mittanbud. Merkevare, språk og flyt er egne.

## Kom i gang

```bash
npm install
npm run db:push
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

`prisma/schema.prisma` er **PostgreSQL** (det Vercel og `prisma generate` uten flagg bruker). Lokalt med `file:./dev.db` genereres `prisma/schema.sqlite.prisma` via `postinstall` / `npm run db:push`. Ikke kjør `npx prisma generate` lokalt mot SQLite-URL uten `--schema=prisma/schema.sqlite.prisma`.

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
| `ALLOW_DEMO_HINTS` / `DEMO` | Nei | `1` = vis delt DEMO-passord på /logg-inn. **Standard av i produksjon.** |
| `ADMIN_DEMO_ALLOWED` | Nei | `1` = tillat `admin@demo` med svakt passord. **Standard av i produksjon.** |
| `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` | Anbefalt i prod | Oppretter én sterk admin hvis e-posten mangler. Minst 16 tegn. Ikke `Demo1234!`. |
| `CONTACT_EMAIL` | Nei | Vises på /kontakt. |

Prisma-klienten opprettes **ikke** ved import. Mangler eller fil-SQLite `DATABASE_URL` på Vercel gir en norsk statusmelding på forsiden — ikke en hard 500.

Etter deploy uten database: forsiden lastes med advarsel. Med gyldig `DATABASE_URL`, `db:push` og `SEED_DEMO=1` vises Oslo-oppdrag.

**Minimum for at preview skal vise mer enn advarselen:** `DATABASE_URL` (Neon/Turso) + `SESSION_SECRET` (eller `AUTH_SECRET`) + `DEMO_WEBHOOK_SECRET`. Deretter `npm run db:push` mot den samme URL-en.

### Hvis Vercel-deploy feiler på noen få sekunder

Da er det ofte prosjektinnstillinger, ikke appen. Sjekk **Build Logs** på deployen (ikke bare GitHub-statusen):

1. **Ikke sett `NODE_ENV` i Vercel.** Next setter `production` under `next build`. `NODE_ENV=development` knuser Next 16-bygget.
2. `DATABASE_URL` må være `postgresql://…` (Neon) eller `libsql://…` (Turso). `file:./dev.db` virker ikke på serverless.
3. Ikke lim inn hermetegn rundt verdien (`"postgresql://…"`).
4. Hobby-kvote / avbrutte bygg: åpne [jobbenmin på Vercel](https://vercel.com/andershuseby88-5389/jobbenmin) og les feilmeldingen på siste deploy.

## DEMO-kontoer

Delt passord (`Demo1234!`) vises **ikke** på /logg-inn i produksjon. Sett `ALLOW_DEMO_HINTS=1` bare på lokal/preview uten ekte brukere.

| Rolle | E-post | Merknad |
| --- | --- | --- |
| Kunde | `kari@demo.jobbenmin.no` | Åpne oppdrag (med demo-bilder) + booking som venter på betaling |
| Kunde | `ola@demo.jobbenmin.no` | Betalt booking (kontakt låst opp) og fullført jobb med anmeldelse |
| Bedrift | `bjorn@nordfjell.no` | Nordfjell Elektro AS |
| Bedrift | `silje@osloror.no` | Oslo Rør & Bad AS |
| Admin | `admin@demo.jobbenmin.no` | Sås/logges inn bare når `ADMIN_DEMO_ALLOWED=1` (ikke produksjon) |

### Produksjon (Anders)

1. **Ikke** sett `ALLOW_DEMO_HINTS`, `DEMO`, `ADMIN_DEMO_ALLOWED` eller `SEED_DEMO` mot ekte data.
2. Sett `ADMIN_BOOTSTRAP_EMAIL` + et unikt passord (≥16 tegn) og restart, **eller** opprett admin manuelt.
3. Hvis `admin@demo.jobbenmin.no` allerede finnes: deaktiver/slett den, eller bytt passord. Innlogging er blokkert uten `ADMIN_DEMO_ALLOWED=1`.
4. `SEED_RESET=1` sletter hele basen — aldri mot produksjon.

## Forretningsmodell

- Gratis å registrere, legge ut oppdrag og gi tilbud.
- Plattformen tar et konfigurerbart gebyr (standard **10 %**, 1000 basispunkter) bare av **betalte** jobber.
- Eksempel: 5 000 NOK jobb → kunden betaler 5 000. 500 NOK er opptjent provisjon som avregnes typisk via faktura — ikke automatisk trukket fra Vipps ennå.

**Antakelser (ikke regnskapssannhet):**

- Beløp er inkl. avtalt fastpris, lagret i øre.
- Kortgebyr, utbetalingsgebyr og MVA er **ikke** beregnet.
- Plattformen holder **ikke** kundens penger i depot (ingen escrow).
- DEMO simulerer bekreftelse → opplåsing. Vipps reserve/capture er ikke live.

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
- **Oppdragsbilder (DEMO-lagring):** JPEG/PNG/WebP, maks 6 filer à 5 MB. Bildene re-kodes til JPEG på serveren (EXIF/GPS strippes). Bytene lagres i databasen (`JobImage`) og vises via `/api/jobs/[id]/images/[imageId]`. **Kontaktlås gjelder ikke bilder** — bare telefon, e-post og eksakt adresse. Utførere som kan se et åpent oppdrag for å gi tilbud, og den bookede utføreren etter booking, skal se de samme bildene kunden lastet opp. Filsystem/Vercel Blob brukes **ikke**. **Ingen OCR** av bilder i denne MVP-en. Chat-vedlegg er slått av.

## Juridiske forbehold

Tekst om vilkår, personvern, avbestilling og merker er **produktutkast**, ikke juridiske fakta. Avklar GDPR, forbrukerrett, håndverkertjenester og betalingsregulering med advokat. Forretningsidentitet vises tidlig; direkte kontakt og gateadresse først etter betalt booking.

Merket **«Org.nr format OK»** betyr format + kontrollsiffer i DEMO. Det er ikke et oppslag i Brønnøysund eller faglig godkjenning.

## Hva som ikke er ferdig

- Ekte betaling, KYC, BankID og Brønnøysund-oppslag
- Escrow / holding av kundemidler
- Milepælsbetaling og befaring (egne stubsider)
- Ekte Vipps merchant-integrasjon (DEMO-tillegg finnes)
- Automatisk refusjon og tvistenemnd
- GDPR-innsyn/sletting, e-postvarsler, chat-filvedlegg
- OCR / visuell kontaktfiltrering av oppdragsbilder
- Produksjonshosting, rate limiting og pentest

Se [ARCHITECTURE.md](./ARCHITECTURE.md) for sider, datamodell og tilstandsmaskin.
