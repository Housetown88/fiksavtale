# Betaling og provisjon — én anbefalt løsning

Kilde: [Vipps MobilePay: Important information for merchants](https://developer.vippsmobilepay.com/docs/knowledge-base/merchant-info/) (sist oppdatert mai 2026).

## Hva Vipps faktisk støtter

Vipps MobilePay **støtter ikke** å splitte en betaling for å ta gebyr. To offisielle alternativer:

1. Motta hele beløpet, ta gebyret, betal resten til firmaet. Kan kreve tillatelse som e-pengeforetak.
2. La firmaet motta hele beløpet, og send faktura for gebyret etterpå.

Standard reservasjon/trekk i ePayment dekker **ikke** markedsplass med automatisk gebyrsplitt og forsinket utbetaling til mange firmaer.

## Anbefaling for Jobbenmin (én løsning)

**Single-merchant + intern oppgjørsbok.**

- Jobbenmin er (når live) den eneste Vipps-selgeren.
- Kunden finansierer jobbprisen (+ betalte tillegg) til plattformen.
- Provisjon registreres **automatisk** i samme løp (ikke faktura i etterkant).
- Firmaet ser gebyr og forventet oppgjør med en gang.
- Oppgjør til firma etter kundegodkjenning eller frist.
- DEMO speiler denne modellen i `SettlementEntry`. Ingen ekte penger.

Dette er den eneste modellen som oppfyller «automatisk provisjon i betalingsløpet» uten å late som Vipps splitter gebyret.

## Hva som mangler for live

- Vipps-handelsavtale og ePayment TEST/prod-nøkler
- Eierbeslutning: single-merchant (anbefalt) vs. faktura i etterkant (oppfyller **ikke** kravet)
- Juridisk avklaring om mottak av kunders midler
- Utbetalingskanal til firma (bank / senere avtale)
- Ekte refusjon i Vipps

Ikke presenter dette som live.

## Fastlåste DEMO-bookinger (intensjon SUCCEEDED, booking venter)

Symptom: `PaymentIntent.kind = RESERVATION` og `status = SUCCEEDED`, men `Booking.status = PENDING_PAYMENT` og `contactUnlockedAt` er null. Bekreftelsessiden kan vise økt-status uten at bookingen er finansiert.

Årsak (fikset i kode): DEMO-bekreftelse/webhook markerte intensjonen som lykkes uten å kjøre booking-sideeffektene (`PAID` + opplåst kontakt).

Reparasjon etter deploy — **ikke** oppdater én produksjons-id for hånd:

1. Kunden åpner bekreftelsessiden og trykker **Bekreft DEMO-betaling** på nytt. `confirmDemoPayment` ser den allerede lykkes reservasjonsintensjonen og kaller `applySucceededReservationFinance`.
2. Alternativt, én gang i et vedlikeholdskall mot databasen: `repairUnfinancedSucceededReservations(db)` i `src/lib/payments.ts`. Funksjonen finner alle rader med lykkes reservasjon + `PENDING_PAYMENT`, setter `PAID` + `contactUnlockedAt`, og hopper over provisjon som allerede er bokført. Trygg å kjøre flere ganger.

Return-URL / GET mot bekreftelsessiden finansierer ikke — det ville brutt kontaktlåsen.

## Fastlåste DEMO-tillegg (hovedjobb finansiert, tillegg venter)

Symptom: `Booking.status` er `PAID` eller `IN_PROGRESS`, `ExtraCharge.status = APPROVED`, og `PaymentIntent.kind = EXTRA` er fortsatt `PENDING`. Bekreftelsessiden kunne tidligere vise «Betalingen er bekreftet» / «Tillegget er merket som betalt i DEMO» fordi hovedjobben allerede var finansiert — uten at tillegget ble betalt. Fullføring forble blokkert.

Årsak (fikset i kode): bekreftelses-UI brukte bookingens finansieringsstatus (PAID/IN_PROGRESS + opplåst kontakt) også for EXTRA-intensjoner.

Reparasjon etter deploy — **ikke** oppdater produksjons-id-er for hånd:

1. Kunden åpner bekreftelsessiden for tilleggsintensjonen (`/booking/[id]/bekreftelse?intent=…&extra=…`) og trykker **Bekreft DEMO-betaling**. `confirmDemoPayment` kaller `applySucceededExtraFinance`: intensjon `SUCCEEDED`, `ExtraCharge` `PAID`, `EXTRA_CHARGE` + `EXTRA_COMMISSION` i oppgjørsboken, oppgjørstall synkes. Flere PENDING EXTRA-intensjoner på samme tillegg er trygge: første bekreftelse betaler, senere treff er idempotente.
2. Hvis intensjonen allerede er `SUCCEEDED` mens tillegget fortsatt er `APPROVED`: samme knapp, eller én gang i vedlikehold `repairUnpaidApprovedExtras(db)` i `src/lib/payments.ts`. PENDING-intensjoner auto-betales **ikke** av hjelpefunksjonen — de skal bekreftes av kunden.

Hovedjobbens `amountOre` og reservasjonsfinansiering endres ikke. Godkjente ubetalte tillegg blokkerer fortsatt fullføring på aktive bookinger. Avbestilling, refusjon og tvist kansellerer ventende EXTRA-intensjoner. Åpning av en gammel bekreftelses-URL etter `REFUNDED`/`DISPUTED`/`CANCELLED` avviser DEMO-bekreftelse uten ny finansiering eller provisjon. Late Vipps-webhooks (når de finnes) ignoreres eksplisitt (`ignored: booking_closed`) uten å bokføre provisjon.

