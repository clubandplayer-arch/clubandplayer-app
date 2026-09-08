# FASE 5E-C — Internal service read-only CanonicalSportContext

Data: 2026-09-08  
Stato: **IMPLEMENTATA E TESTATA REPOSITORY-ONLY — NESSUNA ROUTE O ESECUZIONE REMOTA**

## 1. Perimetro

`lib/taxonomy/canonicalSportContextService.server.ts` aggiunge un servizio server interno che riceve per dependency injection il resolver repository 5E-B. Non crea un client Supabase, non espone endpoint e non viene importato da route, componenti o form.

Restano esclusi: UI, selector, route pubbliche, write, Organization/Competition, PlayerPosition/StaffRole resolution, migration, seed, manifest, import, backfill, Preview/Production, RLS/grant, Profiles, Opportunities, Applications e Mobile. 5D-E-I resta aperta, non iniziata e non autorizzata, con FR/ES/CH/SI/PL tracciati.

## 2. Wire context

Il servizio restituisce esattamente il `CanonicalSportContext` 5B:

- `resolution`;
- `sportId`;
- `disciplineId`;
- `variantId`;
- `playerPositionId`;
- `staffRoleId`.

Per `canonical` e `legacy_mapped`, gli ID Sport/Discipline/Variant provengono esclusivamente dal contesto validato 5E-B. Per `legacy_raw`, `ambiguous`, `empty` e `invalid_reference`, tutti gli ID sono null: il servizio non fabbrica riferimenti. `playerPositionId` e `staffRoleId` restano null perché fuori dal perimetro 5E-C.

Il raw legacy e l'eventuale display fallback restano nei campi legacy già esistenti del futuro caller: non vengono duplicati o tradotti dentro il context canonico.

## 3. Boundary e contract test

Il servizio inoltra l'input read una sola volta al repository e trasforma esclusivamente il risultato. I contract test coprono tutti i sei stati, parità IDs tra canonical e mapping univoco, null fail-closed negli altri stati e shape esatta del wire object. Non vengono esposti `canonicalName`, `isActive` o record catalogo interni.

Nessun test usa Supabase o dati reali. Nessun payload runtime cambia perché non esiste ancora un caller applicativo.

## 4. Review e prossimo passaggio

**Verifica umana:** non è richiesto smoke UI, Console, Network o Supabase. Review soltanto della shape wire e della regola: IDs presenti esclusivamente per `canonical`/`legacy_mapped`, null per gli altri stati.

**Prossimo passaggio autorizzabile: 5E-D — internal write-plan service Sport/Discipline/Variant**, ancora senza persistenza, route o UI. Deve usare il planner 5E-A e il repository 5E-B per validare riferimenti attivi/coerenti e produrre soltanto un piano canonical+legacy atomico; qualsiasi compatibility projection deve provenire da mapping esatto e stabile. Nessuna Organization/Competition, migration, seed, import, backfill o esecuzione Production. 5D-E-I resta non iniziata.
