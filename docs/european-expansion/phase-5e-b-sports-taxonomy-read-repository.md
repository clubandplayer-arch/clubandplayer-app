# FASE 5E-B — Repository adapter read-only Sport / Discipline / Variant

Data: 2026-09-08  
Stato: **IMPLEMENTATA E TESTATA REPOSITORY-ONLY — NON COLLEGATA A ROUTE, UI O PRODUCTION**

## 1. Perimetro

È stato aggiunto `lib/taxonomy/sportsTaxonomyRepository.server.ts`, adapter server read-only limitato alle quattro tabelle foundation `sports`, `sport_disciplines`, `sport_variants` e `legacy_sport_mappings`. Riceve il client Supabase per dependency injection, ma in 5E-B non viene istanziato da route o runtime caller e non è stato eseguito contro Preview/Production.

Sono esclusi: Organization/Competition, position/staff role, UI/selector, API pubbliche, write, migration, seed, manifest, import, backfill, modifica RLS/grant, Profiles, Opportunities, Applications e Mobile. 5D-E-I resta aperta, non iniziata e non autorizzata.

## 2. Query bounded e mapping

`SupabaseSportsTaxonomyDataSource` espone soltanto SELECT:

- lookup Sport per ID con `maybeSingle`;
- lookup Discipline per ID con `maybeSingle`;
- lookup Variant per ID con `maybeSingle`;
- lookup exact di un mapping legacy attivo, normalizzato con la stessa funzione della foundation, limitato a due righe per rilevare fail-closed un'eventuale ambiguità.

Un contesto canonicale richiede al massimo tre lookup exact-ID. Un legacy univoco richiede un lookup mapping limitato più al massimo tre lookup di catena. Un risultato ambiguo si ferma dopo il lookup limitato. Non esistono scan globali, fuzzy matching o query di listing.

## 3. Validazione della catena

`SportsTaxonomyRepository.getContext` rifiuta prima della query UUID malformati e Variant senza Discipline. Dopo la lettura verifica:

1. Sport esistente;
2. Discipline esistente e `discipline.sport_id = sport.id`;
3. Variant esistente e `variant.discipline_id = discipline.id`.

`isActive` del contesto è la congiunzione dell'intera catena. Un record inattivo coerente rimane leggibile per lo storico secondo 5E-A; questa tranche non implementa nuove write.

## 4. Integrazione con 5E-A

`resolve` carica uno snapshot bounded e delega la classificazione alla primitive 5E-A:

- canonical coerente ha precedenza e non consulta i mapping legacy;
- canonical parziale, UUID invalido, cross-sport o cross-discipline restituisce `invalid_reference`, senza downgrade;
- in assenza del canonical, mapping exact univoco restituisce `legacy_mapped`;
- zero mapping restituisce `legacy_raw`;
- due mapping restituiscono `ambiguous` senza scegliere un target;
- assenza di entrambi restituisce `empty`.

Il risultato è interno e non cambia payload o comportamento dell'app.

## 5. Verifica e passaggio successivo

I test usano un data source fake: nessuna connessione reale. Coprono limite query, catena valida/inattiva, UUID e shape invalidi senza query, mismatch cross-sport, precedenza canonical, invalid reference, normalizzazione legacy compatibile con DB, mapping limitato a due, ambiguity, raw ed empty.

**Verifica umana:** nessuno smoke UI/Console/Network/Supabase. È richiesta soltanto review del boundary e autorizzazione separata del prossimo passaggio.

**Prossimo passaggio autorizzabile: 5E-C — internal service read-only per il contesto Sport**, che usa il repository 5E-B in un confine server non pubblico e restituisce il wire context 5B, con test contract; ancora nessuna route/UI, write, Organization/Competition, migration, seed, import, backfill o Production execution.
