# FASE 5F-A — Schema additivo primary sport Profile

Data: 2026-09-08  
Stato: **MIGRATION CREATA E TESTATA SU POSTGRESQL 16.15 LOCALE ISOLATO — NON APPLICATA A PREVIEW/PRODUCTION**

## 1. Perimetro

La migration `supabase/migrations/20261208120000_profile_primary_sport.sql` aggiunge a `profiles` esclusivamente:

- `sport_id uuid null`;
- `sport_discipline_id uuid null`;
- `sport_variant_id uuid null`.

Non modifica `profiles.sport`, route, UI, selector, planner, RLS, grant, trigger, seed, import, backfill, Competition, Preview o Production. Non esegue `db push` o `migration repair`. La versione `20261208120000` è unica nella directory migration.

## 2. Integrità della catena

La migration riusa le candidate key composite create da 5C e aggiunge quattro vincoli nominati:

1. `sport_id → sports(id)`;
2. `(sport_discipline_id, sport_id) → sport_disciplines(id, sport_id)`;
3. `(sport_variant_id, sport_discipline_id) → sport_variants(id, discipline_id)`;
4. shape check: Discipline richiede Sport e Variant richiede Discipline.

Tutte le FK usano `ON DELETE RESTRICT`. Le colonne sono nullable, senza default: i profili legacy non richiedono backfill e restano validi con tutti gli IDs null. La migration è transaction-wrapped e protetta per il double-apply senza riscrivere migration storiche.

## 3. Verifica PostgreSQL reale

Harness: `scripts/test-profile-primary-sport-runtime.sh`.

Il test crea un database temporaneo, installa la fixture Profile già usata dai test residence, installa le funzioni e i quattro trigger Profile reali del repository (`profile_location_coerce`, sync names, visibility e demotion notification), aggiunge il catalogo Sport/Discipline/Variant isolato, applica 5F-A due volte e infine elimina il database.

Risultato su PostgreSQL **16.15**:

```text
PHASE_5F_A_PROFILE_PRIMARY_SPORT_PASS
```

Copertura runtime:

- profilo legacy preesistente invariato, con tre nuove colonne null;
- quattro constraint presenti una sola volta dopo double-apply;
- catene sport-only, Sport→Discipline e Sport→Discipline→Variant valide;
- sport inesistente, Discipline senza Sport, cross-sport Discipline e cross-discipline Variant rifiutati;
- quattro trigger Profile esistenti ancora installati/abilitati e canonical-only update compatibile con visibility;
- `UPDATE` e `UPSERT` falliti non lasciano modifiche parziali al gruppo legacy/canonical;
- rollback esplicito ripristina l'intero gruppo.

I mock non sostituiscono questo risultato: le asserzioni sono state eseguite da PostgreSQL reale in un database locale isolato.

## 4. Stato ambienti e rischi residui

**Migration creata:** sì.  
**Test PostgreSQL locale:** sì, PASS.  
**Applicata Preview:** no.  
**Applicata Production:** no.  
**Dati/backfill:** nessuno.

Rischi residui:

- lo schema Production reale non è stato interrogato in 5F-A; il replay locale usa gli oggetti/trigger versionati nel repository;
- l'atomicità è provata a livello database per un singolo statement, ma il planner non è ancora collegato alla route;
- la route corrente non accetta né restituisce ancora il context canonicale;
- Mobile e UI non sono stati modificati;
- 5D-E-I resta aperta e non iniziata per FR/ES/CH/SI/PL, ma non blocca questo schema Sport/Discipline/Variant.

## 5. Prossimo passaggio minimo autorizzabile

**FASE 5F-B — preflight read-only della sola migration 5F-A sugli ambienti condivisi**, per verificare esistenza/tipi di `profiles`, cataloghi e candidate key 5C, collisioni di colonne/constraint, trigger attivi e migration history. Nessun apply, `db push`, repair, backfill o collegamento route.

Solo dopo il PASS del preflight e una separata autorizzazione mutativa sarà possibile proporre l'apply esclusivo 5F-A. Il collegamento del planner a `PATCH /api/profiles/me` resta una fase ancora successiva.
