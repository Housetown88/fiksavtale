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
| `/vilkar`, `/personvern`, `/avbestilling`, `/verifisering`, `/kontakt` | Produktutkast + personvernflyt |
| `/admin/personvern` | Kø for innsyn/eksport/sletting |
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

Kjerneentiteter i `prisma/schema.prisma` (PostgreSQL). Lokalt SQLite: `prisma/schema.sqlite.prisma`.

- `User` + `CustomerProfile` / `ProviderProfile`
- `Job` (offentlig område + privat `addressLine`)
- `JobImage` (re-kodet JPEG + miniatyr i databasen; DEMO-lagring)
- `Offer`, `Conversation`, `Message`
- `Booking` (pris, gebyr, `contactUnlockedAt`)
- `PaymentIntent`, `Payment` (`eventId` unikt)
- `Review` (kun fullførte bookinger)
- `Report` (med behandlingsnotat), `AuditLog`, `PlatformSettings`, `ExtraCharge` (foreslått → godkjent → betalt)
- `PasswordResetToken`, `ContactMessage`, `SettlementEntry`, `DataRequest`, `AuthThrottle`

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
  -> avbestilling før finansiering -> CANCELLED
  -> avbestilling etter finansiering, før start -> REFUNDED + provisjonsjustering
  -> avbestilling etter start -> DISPUTED (oppgjør holdes)
  -> tillegg: PROPOSED -> APPROVED (ikke finansiert) -> DEMO-betaling -> PAID
       -> CHARGE/COMMISSION i oppgjørsbok
```

Idempotens: samme `eventId` returnerer forrige resultat uten ny booking eller endret utbetaling. Allerede betalt booking får ikke ny utbetalingsberegning.

Invariant: reservasjons-`PaymentIntent` med `SUCCEEDED` skal ha booking `PAID` og `contactUnlockedAt`. Innlogget DEMO-bekreftelse kaller `confirmDemoPayment` / `applySucceededReservationFinance`. Fastlåste rader (intensjon SUCCEEDED, booking PENDING_PAYMENT) repareres ved ny bekreftelse eller `repairUnfinancedSucceededReservations` — ikke ved å redigere enkeltrader for hånd. Return-URL alene låser ikke opp.

Invariant (tillegg): EXTRA-`PaymentIntent` finansieres **bare** når bookingen er `PAID` eller `IN_PROGRESS`. Bekreftelse og finansiering sjekker bookingstatus i samme transaksjon. Avbestilling, refusjon og tvist kansellerer ventende intensjoner. `REFUNDED` / `DISPUTED` / `CANCELLED` / `COMPLETED` avviser DEMO-bekreftelse og late webhooks uten ny finansiering eller provisjon. Bekreftelsessiden skiller hovedreservasjon og tillegg. Innlogget DEMO-bekreftelse av tillegg kaller `applySucceededExtraFinance` (`ExtraCharge` PAID + `EXTRA_CHARGE`/`EXTRA_COMMISSION`). Fastlåste PENDING EXTRA-rader på **aktive** bookinger repareres ved å trykke **Bekreft DEMO-betaling**. `SUCCEEDED` EXTRA uten PAID tillegg repareres ved samme knapp eller `repairUnpaidApprovedExtras` — ikke på lukkede bookinger.

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
- budsjettvalidering, tilleggsbetaling, gebyrforhåndsvisning og betalingsstatus-tekst
