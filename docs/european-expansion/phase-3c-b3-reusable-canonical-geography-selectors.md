# FASE 3C-B3 — Reusable canonical geography selectors

## Stato e scope

**COMPLETATA — SELECTOR RIUTILIZZABILI IMPLEMENTATI; NON COLLEGATI AI FORM REALI.**

La fase realizza componenti web read-only e controllati per selezionare Paese e geografia canonica. Non integra i componenti in Profile Edit, Signup, onboarding o geographic interests; non implementa salvataggi o dual-write e non inizia la FASE 3C-B4.

## Componenti permanenti

- `components/geo/CanonicalGeographySelector.tsx`: selector controllato e accessibile.
- `components/geo/canonicalGeographyContracts.ts`: contratto loader tipizzato e adapter HTTP verso gli endpoint B2.
- `components/geo/canonicalGeographySelectorModel.ts`: ricostruzione della gerarchia iniziale e riduzione dei livelli dopo una selezione.
- `app/api/geo/areas/[id]/ancestors/route.ts`: endpoint read-only per area e ancestors.
- `tests/unit/canonical-geography-selector.test.ts`: test deterministici permanenti del modello e del contratto UI.

## Contratto e comportamento

`CanonicalGeographySelector` riceve separatamente `countryId` e `geoAreaId`, espone `onCountryChange` e `onGeoAreaChange` e supporta `disabled`, `required`, errore esterno, label configurabili e loader sostituibile. Non applica un default implicito a IT.

Il loader legge countries supported/active, root del Paese, children diretti e ancestry tramite i contratti B2. La selezione iniziale viene ricostruita confrontando area e ancestors con il Paese scelto. Una incoerenza country/area o una gerarchia non valida produce un errore esplicito.

Quando cambia il Paese, `geoAreaId` viene azzerato e vengono caricate solo le root del nuovo Paese. Quando cambia un livello superiore, tutti i discendenti vengono eliminati; il reset completo azzera country, geo-area e livelli. Loading, empty state, errore e retry sono espliciti.

## Paesi e gerarchie supportate

| Paese | Gerarchia verificata |
| --- | --- |
| IT | REGION → PROVINCE → MUNICIPALITY |
| FR | REGION → DEPARTMENT → COMMUNE |
| ES | AUTONOMOUS_COMMUNITY → PROVINCE → MUNICIPALITY |
| CH | CANTON → DISTRICT opzionale → MUNICIPALITY |
| SI | STATISTICAL_REGION → MUNICIPALITY |
| PL | VOIVODESHIP → POWIAT → GMINA |

Il modello non hardcoda tre livelli: attraversa una profondità variabile e supporta sia il percorso svizzero con District sia quello senza District.

## Accessibilità e responsive

I controlli hanno label associate, stato `required`, fieldset disabilitabile, `aria-busy`, `aria-invalid`, status di caricamento, alert di errore, retry e focus visibile. La validazione ha incluso tastiera, layout desktop, viewport mobile 390×844, nomi lunghi, caratteri accentati, assenza di testi tagliati e assenza di overflow orizzontale.

## Test e validazione visiva

I test automatici coprono: assenza di default IT, caricamento countries/root/children, initial value tramite ancestors, profondità variabile, livello opzionale, mismatch country/area, empty state, propagazione errori/retry, controlled values, disabled, required e semantica accessibile.

La preview QA temporanea ha validato separatamente IT, FR, ES, CH con District, CH senza District, SI, PL, cambio Paese, reset discendenti, reset completo, loading, errore/retry, accessibilità e viewport mobile. **Esito approvato: 14 PASS, 0 FAIL.** Dopo l'approvazione, `app/qa/canonical-geography-selectors/page.tsx` e `CanonicalSelectorPreview.tsx` sono stati rimossi; nessuna route QA, fixture di preview o screenshot è parte del deliverable permanente.

## Live-data gate obbligatorio per B4

**DEFERRED MANUAL LIVE-DATA GATE — da eseguire nella FASE 3C-B4 in un ambiente Preview collegato a Supabase**

Questo gate è obbligatorio prima di poter marcare la **FASE 3C-B4 COMPLETATA**. Deve verificare con dati canonici reali:

- countries, root areas, children e ancestors;
- IT, FR, ES, CH con District, CH senza District, SI e PL;
- assenza di default implicito a IT;
- coerenza country/geo-area;
- reset delle selezioni;
- lettura canonica dopo il salvataggio del profilo.

La connessione Supabase dell'ambiente QA B3 falliva prima della valutazione RLS; non sono state aggirate autorizzazioni. Le fixture certificano il comportamento deterministico dei selector, non la disponibilità dei 56.304 record reali nell'ambiente di integrazione B4.

## Limiti residui e readiness per B4

I selector sono implementati ma non ancora collegati ai form. B4 dovrà definire l'integrazione di Profile Edit e il dual-write controllato, senza ricostruire residence dagli `interest_*`. Il live-data gate precedente resta bloccante per il completamento di B4.

La fase non ha modificato form reali, Signup, onboarding, migration, RLS, schema o dati Supabase; non ha effettuato dual-write, backfill o mobile parity. La FASE 3C-B complessiva resta **NOT COMPLETED**.
