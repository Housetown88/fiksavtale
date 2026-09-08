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
