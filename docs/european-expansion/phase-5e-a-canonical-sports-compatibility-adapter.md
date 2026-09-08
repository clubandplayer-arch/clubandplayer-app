# FASE 5E-A — Resolver canonical-first e compatibility planner

Data: 2026-09-08  
Stato: **IMPLEMENTATA E TESTATA REPOSITORY-ONLY — NESSUN COLLEGAMENTO RUNTIME O REMOTE WRITE**

## 1. Perimetro autorizzato

5E-A introduce una primitive TypeScript pura in `lib/taxonomy/canonicalSportsCompatibility.ts`. Non interroga Supabase, non conosce route o tabelle concrete e non modifica UI. Il catalog adapter viene iniettato dal futuro caller; può quindi essere simulato nei test e può rappresentare cataloghi vuoti o parziali.

Sono esplicitamente esclusi: UI/selector, dati reali, migration, seed 5D-C remoto, manifest, import, backfill, Production, RLS/grant, profili, Opportunities, Applications e Mobile. 5D-E-I resta aperta e non iniziata.

## 2. Read resolver

`resolveCanonicalSportsReference` implementa l'ordine 5B:

1. canonical ID persistito: lookup e validazione dell'intera catena tramite callback;
2. soltanto quando il canonical ID è assente, mapping legacy scoped;
3. raw legacy invariato;
4. empty.

Gli stati sono `canonical`, `legacy_mapped`, `legacy_raw`, `ambiguous`, `empty` e `invalid_reference`. Un canonical ID mancante o incoerente resta `invalid_reference`: il raw legacy può essere restituito come `displayFallback`, ma non cambia lo stato e non produce un mapping silenzioso. Un record canonicale inattivo può essere risolto in lettura storica se la catena è coerente; ciò non lo rende selezionabile per una nuova write.

## 3. Write parser e planner

`parseCanonicalSportsWriteIntent` distingue:

- `absent`: nessuna chiave, quindi `no_change`;
- `reset`: solo `reset: true`, isolato, con clear canonical+legacy del solo gruppo;
- `legacy`: stringa non vuota;
- `canonical`: ID non vuoto.

Canonical+legacy, reset combinato, null e stringhe vuote falliscono prima del piano. `planCanonicalSportsWrite`:

- accetta una write canonicale solo per un record attivo e una catena coerente;
- usa una compatibility label stabile fornita dall'adapter, mai una traduzione UI;
- dual-write un legacy soltanto con un unico mapping attivo e coerente;
- per unknown, ambiguous o mapping inattivo preserva il raw legacy e azzera soltanto il canonical ID del gruppo;
- non applica default sport, Paese, ruolo, competition o season.

Il risultato è un piano dati, non una write. Atomicità, autorizzazione e persistenza restano responsabilità del futuro repository/caller.

## 4. Cataloghi e dipendenze

La primitive non richiede ora la chiusura delle lacune FR/ES/CH/SI/PL. I test dimostrano cataloghi parziali, record inattivi, unknown e ambiguity. La 5D-E-I sarà necessaria prima di approvare e mostrare una tranche reale di organization/competition nei selector, non prima della foundation adapter.

Il seed controlled vocabulary 5D-C rimane non applicato remotamente. Nessuna route usa ancora questa primitive e nessun payload pubblico cambia.

## 5. Verifiche automatiche e manuali

Unit test dedicati coprono precedenza canonical, invalid reference senza downgrade, mapping univoco, raw, ambiguity, empty, inactive historical read, parser field-aware, reset, stable projection, write canonicale invalida e clear dello stale canonical per legacy non risolvibili.

**Verifica umana:** non è richiesto smoke UI/Console/Network/Supabase. È richiesta soltanto review del contratto e conferma che la prossima tranche 5E-B possa collegare il resolver a un repository read-only per il solo contesto Sport/Discipline/Variant, ancora senza UI o write Production.

## 6. Passaggio successivo autorizzabile

**5E-B — repository adapter read-only Sport/Discipline/Variant**, con query bounded e chain validation, integrazione in una funzione server interna non esposta alla UI, fixture/local test e nessuna migration/seed/import/backfill. Non includere ancora Organization/Competition né write runtime; 5D-E-I resta non iniziata.
