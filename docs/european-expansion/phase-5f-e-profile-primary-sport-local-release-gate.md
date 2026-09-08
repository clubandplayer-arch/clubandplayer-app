# FASE 5F-E — Review 5F-D e release gate locale primary sport

Data: 2026-09-08  
Stato: **PASS LOCALE — NON DEPLOYATO, NESSUNA OPERAZIONE REMOTA**

## Obiettivo e perimetro

Review circoscritta al diff 5F-D e al contratto request/errori di `PATCH /api/profiles/me`, seguita da un gate locale di release. Sono esclusi UI, selector, Competition, nuove migration, seed, import, backfill, merge, deploy e write Preview/Production. Il GET user-reported con `sport="Calcio"` e ID null è soltanto una baseline di lettura legacy e non è trattato come prova del PATCH.

## Esito review

**PASS senza blocker residui nel perimetro repository.**

1. Il planner usa il client Supabase autenticato della route e viene invocato prima di una sola mutation Profile.
2. L'assenza di `sport`/`primarySport` non produce colonne sport nel payload; il solo alias legacy resta supportato.
3. Reset, legacy raw, mapping univoco e canonical attivo/coerente producono sempre il gruppo indivisibile di quattro colonne.
4. Input legacy e additivo insieme, payload malformed, canonical invalido o inattivo falliscono prima della mutation con code 400 stabile.
5. La review ha rilevato che una negazione RLS sarebbe confluita nel 500 opaco. È stata rimediata mappando esclusivamente il code PostgreSQL `42501` a `profile_primary_sport_forbidden` HTTP 403; ogni altro errore inatteso resta `profile_primary_sport_write_failed` HTTP 500 senza dettagli interni.
6. UPDATE e UPSERT restano owner-scoped tramite `user.id`; FK/check garantiscono rollback della statement completa.

## Gate locale eseguito

- contract test del request adapter e della route source boundary;
- planner matrix per absent/reset/legacy/canonical/inactive/incoherent;
- PostgreSQL 16 isolato per nove trigger abilitati, RLS owner-only, catene valide/invalide, UPDATE/UPSERT atomici e rollback;
- suite unit, lint e typecheck.

## Limiti

Il test route è un contract test del source boundary più test eseguibile dell'adapter puro; non avvia un server Next né effettua una richiesta HTTP end-to-end. Cinque dei nove trigger locali sono stub nominali/semantici e non copie dei body Production. Nessun test dimostra il comportamento del codice dopo deploy, e nessun campo canonicale è stato valorizzato sul profilo Production osservato.

## Prossimo controllo concreto

**Review umana del payload e degli errori 5F-E.** Se approvata, la successiva autorizzazione dovrà riguardare separatamente un deploy/canary e una singola prova PATCH owner-scoped con piano di ripristino; questa fase non li esegue né li autorizza.
