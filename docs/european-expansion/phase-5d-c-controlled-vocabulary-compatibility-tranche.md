# FASE 5D-C — Controlled vocabulary e compatibility tranche

Data: 2026-09-07
Dipendenze: FASE 5D-B completata; autorizzazione utente esplicita alla 5D-C.
Stato: **IMPLEMENTATA E TESTATA LOCALMENTE — contenuto in attesa di revisione umana; migration NON APPLICATA remotamente**.

## 1. Perimetro

La 5D-C materializza una prima tranche esclusivamente controllata e backward-compatible per i valori già accettati dal Web/API:

- gender category di competizione;
- formati generici di competizione;
- territorial scope;
- posizioni Player per tutti i 14 valori sportivi legacy correnti;
- ruoli Staff trasversali;
- applicability Player verso Sport/Discipline/Variant;
- mapping esatti dalle stringhe Player e Staff legacy.

Non contiene organizzazioni, competizioni reali, livelli, classi d'età, stagioni, edizioni o gruppi. Non classifica `CATEGORIES_BY_SPORT`, non modifica dati utente e non collega ancora i cataloghi ad API/UI: questi domini restano nelle sottofasi successive.

## 2. Artefatti

### Manifest revisionabile

`data/sports/phase-5d-c-controlled-vocabulary.json`

- file SHA-256: `38634744e6e87b670950042334e6f14192aa6a5af58669e2400b0996a649e52a`;
- payload checksum del contratto 5D-B: `sha256:cff8258b19c1ec73ee075227c402535e2648328cf699baf22e492ec8a4c6d5a0`;
- provider: `clubandplayer_internal_controlled_vocabulary`;
- licenza: `CLUBANDPLAYER_INTERNAL_CONTROLLED_VOCABULARY`;
- record totali: **356**.

Il manifest è una decisione prodotto interna e una compatibility projection dei valori esistenti; non pretende di essere un registry ufficiale di federazioni o competizioni.

### Migration seed

`supabase/migrations/20261207120000_seed_controlled_sports_vocabulary.sql`

- file SHA-256: `85367f245d3f216b8678a7701be3bbc413067d0b007dac79cb1f199d854fbfa6`;
- DML soltanto sulle otto tabelle catalogo/mapping 5C incluse nella tranche;
- nessun DDL, grant, revoke, policy, trigger o function;
- `ON CONFLICT DO NOTHING` seguito da assertion complete del payload: un record identico rende il rerun idempotente; una collisione divergente causa rollback;
- nessun UUID hardcoded: tutte le FK vengono risolte tramite code della foundation.

## 3. Inventario controllato

| Entity kind | Record | Decisione |
| --- | ---: | --- |
| `gender_category` | 3 | `male`, `female`, `mixed`; categoria della competizione, non identità personale |
| `competition_format` | 4 | `round_robin`, `knockout`, `group_then_knockout`, `hybrid` |
| `territorial_scope` | 6 | `global`, `continental`, `multi_country`, `national`, `subnational`, `local` |
| `player_position` | 97 | identity esplicitamente sport/variant-scoped nel code per evitare falsi equivalenti |
| `staff_role` | 26 | ruoli globali; zero applicability significa trasversale |
| `player_position_applicability` | 97 | una catena esplicita per ciascuna posizione |
| `legacy_player_position_mapping` | 97 | copertura 1:1 di tutti i valori correnti `SPORTS_ROLES` |
| `legacy_staff_role_mapping` | 26 | copertura 1:1 di tutti i valori correnti `STAFF_ROLES` |
| organization/competition/season/level/age/edition/group | 0 | deliberatamente rinviati a fonti primarie e tranche dedicate |

Le posizioni omonime come `Portiere`, `Ala`, `Centro` e `Pivot` non sono fuse sulla base della label italiana: ricevono code scoped allo sport e mapping scoped. Association football, eight-a-side e futsal usano anche Discipline/Variant esplicite.

## 4. Compatibilità

- Le stringhe legacy restano invariate e sono salvate come `source_value`.
- `normalized_source_value` usa la normalizzazione già adottata dalla foundation: Unicode deaccent, trim, lowercase, separatori in underscore.
- Player mapping include sempre lo Sport e, quando esistono, Discipline e Variant.
- Staff mapping è globale perché i ruoli Staff restano trasversali.
- Il mapping è esatto; non esistono fuzzy match, traduzione, default o inferenza.
- Nessun campo legacy viene aggiornato o backfillato.
- Il catalogo non è ancora letto o scritto dai flussi applicativi.

## 5. Sicurezza della migration

La migration usa una transazione unica. I conflitti vengono trattati così:

1. una natural key già presente non viene sovrascritta;
2. le assertion finali confrontano code, canonical name, ordine, flag, scope e target dei mapping;
3. se il contenuto esistente è differente, viene sollevata un'eccezione e l'intera transazione effettua rollback;
4. il secondo apply identico conserva gli stessi conteggi.

La migration non deve essere eseguita con `supabase db push`, perché la migration history generale resta incompleta. Qualunque futuro apply remoto richiede preflight read-only, hash verification, procedura esclusiva e autorizzazione mutativa separata.

## 6. Test locali

Harness: `scripts/test-controlled-sports-vocabulary-runtime.sh`.

Il test PostgreSQL 16.15:

- crea un database temporaneo;
- installa foundation sintetica con tutti gli Sport interessati e la catena football;
- applica lo schema 5C;
- applica la migration 5D-C due volte;
- verifica conteggi, scope, zero Staff applicability e assenza di organization/competition;
- verifica assenza dei domini runtime protetti;
- introduce un drift sintetico e conferma che il terzo apply fallisca e faccia rollback;
- elimina il database temporaneo.

Risultato: `PHASE_5D_C_CONTROLLED_SPORTS_VOCABULARY_PASS`.

## 7. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-C** |
| Stato | **IMPLEMENTATA E TESTATA LOCALMENTE; REVIEW UMANA PENDING** |
| Codice modificato | **SÌ — manifest, migration, test statici/runtime e documentazione** |
| API/UI/runtime Web modificati | **NO** |
| Migration creata | **SÌ — `20261207120000_seed_controlled_sports_vocabulary.sql`** |
| Migration testata | **SÌ — PostgreSQL 16.15, doppio apply + drift rejection PASS** |
| Migration applicata Preview/Production | **NO / NO** |
| Seed applicato remotamente | **NO** |
| Backfill | **NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership modificati | **NO / NO / NO** |
| Applications modificata | **NO** |
| Impatto Web/API | **NESSUN IMPATTO RUNTIME** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Blocker | revisione umana contenuto; preflight remoto futuro; migration history generale incompleta |
| Prossimo passaggio autorizzabile | chiusura 5D-C dopo review; poi **5D-D source registry**, con nuova autorizzazione |

## 8. Verifica manuale richiesta

Non è richiesto uno smoke UI, Console o Network perché il manifest non è collegato all'applicazione. È però richiesta una **review umana del contenuto** prima di dichiarare la 5D-C completata:

1. aprire `data/sports/phase-5d-c-controlled-vocabulary.json`;
2. confermare i 3 gender code e verificare che non rappresentino identità personali;
3. confermare i 4 format code;
4. confermare i 6 territorial scope e i relativi flag;
5. controllare almeno le sezioni Player di `Calcio`, `Calcio a 8`, `Futsal`, `Volley`, `Basket`, `Rugby`, `Baseball` e `Football americano`;
6. verificare che ogni `sourceValue` legacy sia invariato e punti a una posizione coerente;
7. controllare tutti i 26 ruoli Staff, in particolare `president`, `sporting_director`, `general_manager`, `team_official`, `head_coach`, `strength_conditioning_coach`, `team_doctor` e `press_officer`;
8. confermare che nessuna categoria come `Serie A`, `Prima Categoria`, `Giovanili`, `Altro`, `CSI` o `UISP` sia stata trasformata in competizione/livello;
9. non applicare ancora la migration su Supabase.

L'esito deve essere comunicato come PASS oppure con l'elenco puntuale dei code/mapping da correggere.

## 9. Mobile

La repository Mobile non è stata aperta né modificata. Le stringhe legacy consumate dai client pubblicati restano invariate. Mobile parity FASE 5 resta **NOT STARTED / NON MODIFICATO**.
