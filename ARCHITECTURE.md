# Arkitektur — Jobbenmin

Prototypen er en Next.js App Router-app (TypeScript) med Prisma, øktbasert innlogging og et DEMO-betalingsløp. Lokalt brukes SQLite (`file:./dev.db`). På Vercel brukes Neon Postgres eller Turso/libSQL via `DATABASE_URL` — fil-SQLite virker ikke i serverless. Merkevaren er Jobbenmin; jobbenmin.no er tiltenkt merkevare-domene og er ikke bekreftet som ledig eller registrert her.

## Sider

| Rute | Formål |
| --- | --- |
| `/` | Landing, gebyreksempel, åpne oppdrag |
| `/logg-inn`, `/registrer` | Øktinnlogging / registrering |
| `/oppdrag` | Søk og filter |
| `/oppdrag/nytt` | Nytt oppdrag (kunde) |
| `/oppdrag/[id]` | Offentlig beskrivelse, tilbud, låst kontakt |
| `/samtaler`, `/samtaler/[id]` | Intern chat |
| `/booking/[id]` | Booking, tillegg, godkjenning, anmeldelse |
| `/booking/[id]/bekreftelse` | Redirect etter DEMO-intent — låser **ikke** kontakt |
| `/oversikt` | Jobber, tilbud, utbetaling |
| `/konto`, `/firma/[id]` | Profil / offentlig bedriftsside |
| `/admin/*` | Brukere, oppdrag, betalinger, gebyr, rapporter, revisjonslogg |
| `/vilkar`, `/personvern`, `/avbestilling`, `/verifisering` | Utkast og forbehold |
| `/milepaeler`, `/befaring` | Planlagte flyter (ikke bygget) |

API (samme tilgangskontroll som UI):

- `GET /api/jobs` — åpne, sanerte oppdrag
- `GET /api/jobs/[id]` — uten kontaktfelt
- `GET /api/jobs/[id]/contact` — 403 til betaling er serverbekreftet
- `GET /api/offers?jobId=` — eier ser alle, bedrift ser egne
- `GET /api/conversations/[id]/messages` — bare deltakere
- `GET /api/bookings/[id]` — bare parter
- `POST /api/demo-payments/webhook` — HMAC-signert, idempotent

## Datamodell

Kjerneentiteter i `prisma/schema.prisma`:

- `User` + `CustomerProfile` / `ProviderProfile`
- `Job` (offentlig område + privat `addressLine`)
- `Offer`, `Conversation`, `Message`
- `Booking` (pris, gebyr, `contactUnlockedAt`)
- `PaymentIntent`, `Payment` (`eventId` unikt)
- `Review` (kun fullførte bookinger)
- `Report`, `AuditLog`, `PlatformSettings`, `ExtraCharge`

Beløp lagres i **øre**.

## Betalings-tilstandsmaskin

```
OPEN job
  -> tilbud sendt (PENDING)
  -> kunde godtar -> Booking PENDING_PAYMENT, job OFFER_ACCEPTED
       -> webhook payment.failed | payment.cancelled
            -> Payment FAILED/CANCELLED
            -> Booking forblir PENDING_PAYMENT
            -> contactUnlockedAt = null
       -> webhook payment.succeeded (første gang)
            -> Payment SUCCEEDED
            -> Booking PAID, job BOOKED
            -> contactUnlockedAt settes
  -> bedrift starter arbeid -> IN_PROGRESS
  -> kunde godkjenner -> COMPLETED (anmeldelse mulig)
  -> avbestilling -> CANCELLED
```

Idempotens: samme `eventId` returnerer forrige resultat uten ny booking eller endret utbetaling. Allerede betalt booking får ikke ny utbetalingsberegning.

Kontaktlås: `canViewerSeeContact` krever at viseren er part, `contactUnlockedAt` er satt, bookingstatus er betalt/påfølgende, **og** det finnes en `Payment` med `SUCCEEDED`. En suksess-URL er ikke nok.

## Sikkerhet

- Tilgangssjekk i `src/lib/authz.ts` og kontaktpayload i `src/lib/contact.ts` (aldri «skjul felt i UI»).
- Lekkasjefilter i `src/lib/leak-filter.ts` på oppdrag, tilbud, meldinger, profiltekst og anmeldelser.
- Adminruter sjekker `role === ADMIN`. Gebyrendring, verifisering og rapporthåndtering skrives til `AuditLog`.

## Tester

`npm test` kjører Vitest mot en midlertidig SQLite-fil:

- kontaktlås og feilet/kansellert betaling
- isolasjon av oppdrag/tilbud/meldinger
- webhook-idempotens
- lekkasjefilter
