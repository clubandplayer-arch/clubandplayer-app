# FASE 5E-D — Internal write-plan service Sport / Discipline / Variant

Data: 2026-09-08  
Stato: **IMPLEMENTATA E TESTATA REPOSITORY-ONLY — NESSUNA PERSISTENZA O ESECUZIONE REMOTA**

## 1. Perimetro

`lib/taxonomy/canonicalSportWritePlanService.server.ts` produce soltanto un piano atomico per il gruppo Sport/Discipline/Variant. Riusa il parser/planner 5E-A e il repository 5E-B per verificare contesti e compatibility projection. Non contiene chiamate Supabase e non applica il piano a nessuna tabella.

Esclusi: route, UI, selector, caller runtime, write effettiva, Profiles, Opportunities, Applications, Organization/Competition, Position/StaffRole, migration, seed, manifest, import, backfill, Preview/Production e Mobile. 5D-E-I resta aperta, non iniziata e non autorizzata per FR/ES/CH/SI/PL.

## 2. Input e piano

Il servizio accetta quattro intent field-aware:

- `absent`: restituisce `no_change`;
- `reset: true`: azzera Sport/Discipline/Variant e legacy del solo gruppo;
- `legacyValue`: tenta il mapping exact;
- `canonical`: valida l'intera catena e costruisce IDs + compatibility projection.

Reset combinato, canonical+legacy, canonical parziale e stringhe vuote falliscono prima del piano. Nessun default è applicato.

Il piano `write` contiene soltanto `source`, `sportId`, `disciplineId`, `variantId` e `legacyValue`; non contiene query o istruzioni di persistenza.

## 3. Projection legacy bounded

5E-B è estesa con un lookup SELECT per le `legacy_display_label` attive dello stesso target esatto Sport/Discipline/Variant. La query richiede count exact e legge al massimo 33 righe per un budget configurato di 32:

- zero label: projection `null`, consentita dal contratto 5B;
- alias multipli con la stessa label stabile: una projection univoca;
- label differenti: `ambiguous`, write rifiutata;
- più di 32 mapping: `overflow`, write rifiutata.

I filtri null di Discipline/Variant sono espliciti: un mapping dello Sport base non viene confuso con quello di una Discipline o Variant.

## 4. Semantica write-plan

- canonical: richiede contesto esistente, attivo e coerente;
- legacy mapped: dual-plan canonical IDs + legacy normalizzato soltanto per target univoco e attivo;
- legacy raw/ambiguous/inactive: preserva raw legacy e azzera tutti e tre gli ID stale del gruppo;
- reset: clear completo del gruppo;
- absent: nessun cambiamento.

Il servizio non dimostra atomicità database: prepara un singolo oggetto che un futuro caller transazionale dovrà applicare integralmente.

## 5. Verifica e prossimo passaggio

Test fake coprono i quattro intent, projection nulla/univoca/ambigua/overflow, target missing/inattivo, legacy mapped/raw/ambiguous/inattivo e payload conflittuali o parziali. Nessun test usa Supabase reale.

**Verifica umana:** nessuno smoke UI, Console, Network o Supabase. Review soltanto delle semantiche del piano e del criterio projection.

**Prossimo passaggio autorizzabile: 5E-E — audit e contract del primo caller runtime**, repository-only e senza collegamento: identificare il singolo dominio iniziale (raccomandato Profile primary sport), campi legacy/canonical, confine transazionale, error mapping e rollback test. Non applicare ancora il piano, non aggiungere route/UI/migration/write Production e non avviare 5D-E-I.
