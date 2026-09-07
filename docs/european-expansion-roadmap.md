# European Expansion Master Roadmap

Questo file è il documento master, ufficiale e persistente per l'espansione internazionale ed europea di Club and Player. Deve essere letto **prima** di iniziare qualsiasi nuova fase relativa a Paesi, lingue, geografia, profili, sport, competizioni, Opportunities, Search, Discover, WhoToFollow, Maps, i18n, mobile parity o rollout europeo.

Ogni task futuro deve aggiornare questo documento al termine della fase assegnata. Questo documento non è e non deve diventare un changelog generico dell'intero prodotto Club and Player.

## Current checkpoint

| Voce | Stato verificato |
| --- | --- |
| Last completed subphase | **COMPLETATA — FASE 5D-E-A — SOURCE READINESS GATE PASS USER-REPORTED** |
| Current active phase | **FASE 5D-E-R-ES — PRIMA RICOGNIZIONE DOCUMENTALE SPAGNA COMPLETATA CON COPERTURA PARZIALE; REVIEW PENDING** |
| Next safe action | **Review Spagna; non iniziare la Svizzera prima del feedback e nessun manifest/import** |
| Production canonical geo areas | **56,304 — VERIFIED PRODUCTION** |
| Countries populated in canonical geography | **IT, FR, ES, CH, SI, PL — VERIFIED PRODUCTION** |
| Automatic profile residence backfill | **FORBIDDEN / DELIBERATELY EXCLUDED** |
| Mobile through FASE 4 | **USER-REPORTED REPLICATED — non verificato in questa repository** |
| Mobile FASE 5 parity | **NOT STARTED / NON MODIFICATO — deferred to Mobile repository** |
| FASE 3C-B | **COMPLETATA — B1–B7 repository web/API** |
| FASE 3C-C | **COMPLETATA — C1–C7 PASS** |
| FASE 3C-D | **COMPLETATA — D1–D7 PASS** |

**FASE 3C-B è COMPLETATA nel perimetro repository web/API.** B7 riconferma IT legacy, IT/FR/ES/CH/SI/PL canonicali, account type, canonical-first, fallback e separazione semantica. `/settings` è ora raggiungibile anche dagli Enti su desktop e mobile, senza esporre loro gli interessi mobility. Prima del merge resta richiesta la verifica manuale Preview; mobile international parity resta una fase futura separata.

## Roadmap maintenance rules

1. Leggere questo file prima di iniziare una nuova fase.
2. Lavorare esclusivamente sulla fase assegnata.
3. Non marcare una fase **COMPLETATA** se i test e le verifiche richieste non sono conclusi.
4. Distinguere sempre tra:
   - codice implementato;
   - migration creata;
   - migration applicata;
   - dati Production verificati;
   - UI collegata;
   - mobile parity.
5. Al termine di ogni task aggiornare:
   - Current checkpoint;
   - stato della fase;
   - decisioni architetturali emerse;
   - Production state, se modificato;
   - next phase.
6. Non riscrivere la storia delle fasi precedenti salvo correzione documentata.
7. Non rimuovere decisioni architetturali senza una decisione esplicita successiva.
8. Non iniziare automaticamente la fase successiva.
9. Web è la baseline di sviluppo internazionale.
10. Mobile viene aggiornato successivamente tramite parity controllata 1:1, salvo decisione esplicita differente.

## Locked architectural decisions

### Web-first

**DECISIONE ARCHITETTURALE.** Il repository web è la baseline per l'espansione europea. Il mobile non deve essere modificato finché le relative funzionalità web non sono state validate, salvo decisione esplicita.

### Canonical geography

**DECISIONE ARCHITETTURALE.** `geo_areas` è la fonte geografica canonica europea.

### Italy legacy compatibility

**DECISIONE ARCHITETTURALE.** Le strutture italiane legacy continuano a funzionare durante la transizione. Non eliminare incidentalmente:

- `regions`;
- `provinces`;
- `municipalities`;
- le legacy FK;
- `location_children()`;
- `municipality_sync_region()`;
- `profile_location_coerce()`.

### Canonical read priority

**DECISIONE ARCHITETTURALE.** La priorità di lettura è:

```text
canonical data
↓
Italy legacy mapping fallback
↓
legacy textual fallback
```

### No automatic residence backfill from interest fields

**ESCLUSO DELIBERATAMENTE.** La decisione definitiva della FASE 3C-A è di non trasformare automaticamente:

```text
interest_region
interest_province
interest_city
interest_region_id
interest_province_id
interest_municipality_id
→ residence_geo_area_id
```

I campi `interest_*` hanno una semantica storicamente sovrapposta e possono rappresentare un'area di interesse o scouting anziché la residenza.

### Explicit future canonical residence

**DECISIONE ARCHITETTURALE.** La residence canonica dovrà essere popolata tramite input esplicito dell'utente, flussi UI validati e dual-write controllato.

### Country interests != residence

**DECISIONE ARCHITETTURALE.** `profile_country_interests` rappresenta interessi geografici e non deve essere interpretato automaticamente come residence.

### Geo area interests != residence

**DECISIONE ARCHITETTURALE.** `profile_geo_area_interests` rappresenta aree territoriali di interesse e non deve essere interpretato automaticamente come residence.

### Birth country != residence

**DECISIONE ARCHITETTURALE.** `birth_country` è esclusivamente anagrafico.

## Production geography state

| Country | Provider | Canonical areas | Status |
| --- | --- | ---: | --- |
| IT | `clubandplayer_italy_legacy` | 7,724 | VERIFIED PRODUCTION |
| FR | `fr_insee_cog` | 34,994 | VERIFIED PRODUCTION |
| ES | `es_ine` | 8,203 | VERIFIED PRODUCTION |
| CH | `ch_bfs` | 2,284 | VERIFIED PRODUCTION |
| SI | `si_gurs_surs` | 224 | VERIFIED PRODUCTION |
| PL | `pl_gus_teryt` | 2,875 | VERIFIED PRODUCTION |
| **TOTAL** |  | **56,304** | **VERIFIED PRODUCTION** |

Gerarchie canoniche verificate:

- **IT:** `REGION → PROVINCE → MUNICIPALITY`;
- **FR:** `REGION → DEPARTMENT → COMMUNE`;
- **ES:** `AUTONOMOUS_COMMUNITY → PROVINCE → MUNICIPALITY`;
- **CH:** `CANTON → DISTRICT` opzionale `→ MUNICIPALITY` (oppure municipio direttamente sotto il cantone);
- **SI:** `STATISTICAL_REGION → MUNICIPALITY`;
- **PL:** `VOIVODESHIP → POWIAT → GMINA`.

Per l'Italia esistono **7,724 `legacy_geo_area_mappings`**, con mapping 1:1 verificato verso la geografia canonica italiana.

## FASE 1 — European Catalog Foundation

**Stato: COMPLETATA.**

La fondazione dati verificata nel repository comprende:

- `countries`;
- `sports`;
- `sport_disciplines`;
- `sport_variants`;
- `legacy_country_mappings`;
- `legacy_sport_mappings`.

I Paesi attualmente previsti come supported e active sono **IT, FR, ES, CH, SI e PL**. La Fase 1 è una fondazione dati: il suo completamento non implica che tutte le UI internazionali siano già operative.

## FASE 2 — Languages / Profile Preferences / Country Interests

**Stato: FONDAZIONE COMPLETATA; INTERNAZIONALIZZAZIONE UI NON COMPLETATA.**

Le strutture verificate sono `languages`, `profile_preferences` e `profile_country_interests`.

| Lingue seed | Stato |
| --- | --- |
| `it`, `en`, `fr`, `es` | supported + active |
| `pt`, `de` | presenti, ma non supported/active |

La fase iniziale non ha eseguito un backfill indiscriminato delle preferenze. Preferred language, residence country, `open_to_relocation` e country interests sono concetti distinti e devono restare tali. L'intera internazionalizzazione UI non è completata: appartiene alle fasi future.

## FASE 3 — European Geography

### FASE 3A — Canonical geography model

**Stato: COMPLETATA.**

La fondazione canonica verificata comprende `countries` e `geo_areas`. Ogni area appartiene a un Paese e supporta una gerarchia country-aware mediante `parent_id`, `area_type` e `level`. Il modello conserva provenance del provider, code authority, identità/source record e source metadata. Sono presenti indici per Paese, parent, tipo/livello e ricerca dei nomi, oltre a vincoli di unicità per identità provider/source record e per le chiavi necessarie alla coerenza country-aware.

La struttura è intenzionalmente progettata per gerarchie differenti fra Paesi e non impone il modello italiano a tutti i dataset europei.

### FASE 3B — Official datasets and Production population

**Stato: COMPLETATA E VERIFICATA IN PRODUCTION.**

| Paese | Totale | Dettaglio | Provider |
| --- | ---: | --- | --- |
| Italia | 7,724 | 20 `REGION`; 106 `PROVINCE`; 7,598 `MUNICIPALITY` | `clubandplayer_italy_legacy` |
| Francia | 34,994 | 18 `REGION`; 101 `DEPARTMENT`; 34,875 `COMMUNE` | `fr_insee_cog` |
| Spagna | 8,203 | 19 `AUTONOMOUS_COMMUNITY`; 52 `PROVINCE`; 8,132 `MUNICIPALITY` | `es_ine` |
| Svizzera | 2,284 | 26 `CANTON`; 135 `DISTRICT`; 2,123 `MUNICIPALITY` | `ch_bfs` |
| Slovenia | 224 | 12 `STATISTICAL_REGION`; 212 `MUNICIPALITY` | `si_gurs_surs` |
| Polonia | 2,875 | 16 `VOIVODESHIP`; 380 `POWIAT`; 2,479 `GMINA` | `pl_gus_teryt` |
| **Totale** | **56,304** |  |  |

Sono stati creati preprocessing reali e staging riproducibile. Sono disponibili dry-run, tooling di import Production batch-based e `check-existing`. L'idempotenza è stata verificata; ogni Paese estero è stato verificato con query Production e non risultano errori residui noti. Il reporting di idempotenza è stato corretto affinché i record identici risultino `unchanged`, non `wouldUpdate`. Nessuna credenziale, secret o URL sensibile deve essere aggiunto a questa roadmap.

### FASE 3C-A — Profile canonical geography foundation

**Stato: COMPLETATA — MIGRATION APPLICATA IN PRODUCTION.**

La migration verificata è `supabase/migrations/20261203120000_profile_canonical_geography.sql`.

`profile_preferences.residence_geo_area_id` è nullable, usa una FK verso `geo_areas(id)` e resta backward-compatible. Una FK composita assicura la coerenza tra `residence_geo_area_id` e `residence_country_id`.

`profile_geo_area_interests` contiene:

- `profile_id`;
- `geo_area_id`;
- `priority`;
- `created_at`;
- PK composta (`profile_id`, `geo_area_id`);
- indici per profilo, area e priorità;
- RLS per owner/admin su select, insert, update e delete.

Il dual-read implementato applica l'ordine: (1) canonical residence; (2) Italy legacy mapping; (3) legacy textual fallback. La foundation di dual-write è **IMPLEMENTATA MA NON ANCORA COLLEGATA ALLA UI O AI FORM**: costruisce payload compatibili, ma i caller restano responsabili della persistenza.

In 3C-A nessuna UI è stata modificata, Opportunities non è stata modificata e nessun backfill è stato eseguito.

Report verificati nel repository:

- `scripts/geo/reports/profile-canonical-geography-readiness.sql`;
- `scripts/geo/reports/profile-canonical-geography-backfill-dry-run.sql`;
- `scripts/geo/reports/profile-canonical-geography-report-discrepancy.sql`.

Risultato finale dell'audit Production:

```text
same_snapshot_populations_match
readiness_total = 247
audit_total = 247
readiness_staff_total = 63
audit_staff_total = 63
```

I candidati non sono stati backfillati. Il candidate audit distingueva `safe_municipality_candidate`, `province_only_candidate` e `region_only_candidate`, ma **nessuna** di queste classificazioni autorizza automaticamente un backfill residence.

### FASE 3C-B — Profile UI/write integration

**Stato: NOT COMPLETED — 3C-B1–3C-B4 COMPLETATE; 3C-B5–3C-B7 NOT STARTED.**

#### 3C-B1 — Audit UI/write flows

**Stato: COMPLETATA — AUDIT READ-ONLY/CODE-ONLY; NESSUNA MODIFICA COMPORTAMENTALE.**

Obiettivo: audit read-only/code-only di tutti i punti in cui la geografia profilo viene visualizzata, selezionata, validata, salvata o sincronizzata. L'audit dovrà coprire almeno Signup, onboarding, `ProfileEditForm`, `LocationFields`, `FanProfileForm`, `InterestAreaForm`, eventuali form Club, Player, Staff, Fan e Institution, API/actions/server handlers, write Supabase, hook e validation schema.

Deliverable creato: `docs/european-expansion/phase-3c-b1-profile-geography-ui-write-audit.md`.

Risultati principali: i form attivi leggono e scrivono ancora prevalentemente `profiles` e le strutture legacy italiane; `LocationFields` assume la gerarchia italiana e usa testo libero fuori dall'Italia; la foundation canonica (`geo_areas`, preferenze, interessi, canonical-first resolver e dual-write payload builder) è implementata ma non collegata alla UI. Non sono stati eseguiti write Production, backfill o modifiche a codice, UI, API, schema, migration o test. La FASE 3C-B complessiva resta non completata.

#### 3C-B2 — Canonical geography read APIs/helpers

**Stato: COMPLETATA — FOUNDATION READ-ONLY IMPLEMENTATA; NON COLLEGATA ALLA UI.**

Contratti disponibili: countries supported/active; root e children country/parent-aware; ancestors a profondità variabile; residence canonical-first con Italy legacy residence mapping e fallback testuale; country interests, geo-area interests e relocation semanticamente separati. Deliverable: `docs/european-expansion/phase-3c-b2-canonical-geography-read-contracts.md`.

La fase non ha modificato form o write profilo, non ha implementato selector o dual-write e non ha introdotto migration, backfill, modifiche RLS o dati Supabase.

#### 3C-B3 — Reusable canonical geography selectors

**Stato: COMPLETATA — SELECTOR RIUTILIZZABILI IMPLEMENTATI; NON COLLEGATI AI FORM REALI.** Sono disponibili selector controllati, country-aware e hierarchy-aware e un adapter HTTP read-only basato sui contratti B2. La validazione automatica e visiva della preview QA ha prodotto **14 PASS, 0 FAIL**; la pagina QA temporanea è stata rimossa dopo l'approvazione. Deliverable: `docs/european-expansion/phase-3c-b3-reusable-canonical-geography-selectors.md`.

I selector devono supportare IT, FR, ES, CH, SI e PL senza assumere ovunque `region → province → municipality`: CH, SI, PL, FR ed ES hanno gerarchie differenti.

Non sono stati modificati form reali, write profilo, migration, RLS, schema o dati Supabase; non sono stati eseguiti dual-write o backfill.

Il `DEFERRED MANUAL LIVE-DATA GATE` registrato in B3 è stato successivamente eseguito sulla Preview Vercel collegata a Supabase: **LIVE CANONICAL READ-DATA GATE: PASSED** per countries, root, children, ancestors e gerarchie reali dei sei Paesi. I successivi gate B4 su selector nel form reale, reset, write atomico, salvataggio e rilettura, compatibility legacy Italia, privacy e autorizzazioni sono stati completati prima della closure review B4.

#### 3C-B4 — Profile Edit dual-write

**Stato: COMPLETATA — PROFILE EDIT PLAYER/STAFF, DUAL-WRITE ATOMICO, CANARY APPLICATIVO, READ-AFTER-WRITE, CLEANUP E RIPRISTINO FAIL-CLOSED VERIFICATI.** I nuovi valori sono canonical; la compatibilità legacy viene scritta soltanto dove necessario e semanticamente sicuro. La residence non viene ricostruita dagli `interest_*`. Deliverable: preflight, write contracts e `docs/european-expansion/phase-3c-b4-transactional-profile-residence-rpc.md`.

**LIVE CANONICAL READ-DATA GATE: PASSED.** La verifica manuale read-only sulla Preview Vercel collegata a Supabase ha validato countries, root, children, ultimo livello, ancestors, profondità variabile, coerenza country/parent e caratteri internazionali per IT, FR, ES, CH con e senza District, SI e PL. Selector nel form reale, reset con dati reali, dual-write, salvataggio, rilettura, compatibility legacy Italia, privacy e autorizzazioni sono stati successivamente verificati dal canary e dalla closure review B4.

L'ambiente dati della Preview non era dimostrabilmente separato da Production ed è stato classificato **POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL**. Le sole verifiche mutative eseguite successivamente hanno richiesto autorizzazioni esplicite, scope canary e cleanup. Il Current checkpoint registra ora FASE 3C-B4 come ultima sottofase completata; la FASE 3C-B complessiva resta non completata.

Decisioni approvate per B4: prima integrazione limitata a Player/Athlete e Staff; country-only consentita; RPC transazionale additiva installata manualmente in Production con `EXECUTE` revocato; Club, Institution e Fan esclusi; proiezione legacy testuale estera consentita; assenza di geography/interest nel PATCH significa non modificare. Ogni attivazione, grant persistente o write reale ulteriore richiede una nuova approvazione esplicita.

B4.3 ha creato nel repository la migration additiva `20261204120000_transactional_profile_residence_rpc.sql` e il wrapper server, con scope atomico limitato ai campi residence. Al checkpoint B4.3 la migration era stata eseguita soltanto nel database temporaneo locale; il successivo percorso B4.4 esplicitamente autorizzato l'ha installata manualmente in Production mantenendo `EXECUTE` revocato. Il default server `interest_country = 'IT'` e il fallback analogo in `ProfileEditForm` sono stati rimossi in B4.4 Step 1; i test di regressione verificano che un campo assente non introduca un default geografico implicito.

**B4.3 LOCAL RUNTIME HARNESS: PASSED; PREVIEW BRANCH CERTIFICATION: HISTORICAL BLOCK.** Il 2026-08-26 la migration e la matrice RPC sono state eseguite realmente in PostgreSQL 16 locale con fixture sintetiche: firma/grants, RLS rilevanti simulata, ruoli, reset, country-only, IT, FR, ES, CH con e senza District, SI, PL e rollback hanno superato i controlli. In quel checkpoint nessuna connessione o write remoto era stato eseguito e il database temporaneo era stato eliminato. Il Preview Branch isolato non ha completato la ricostruzione della history; il successivo percorso Production manuale fail-closed è registrato separatamente sotto.

**SUPABASE PREVIEW BRANCH WORKFLOW: HISTORICAL BLOCK — SUPPORT PENDING.** Il branch dedicato `b4-rpc-validation` è `UNHEALTHY`: il workflow del 2026-08-26 10:55:32 è fallito allo step `MIGRATIONS` senza dettaglio disponibile. Il percorso alternativo Production è stato autorizzato ed eseguito per blocchi controllati: RPC e trigger guards installati e verificati, canary database con RLS installato, due membership dedicate qualificate, test transazionale Player/Staff completato con rollback obbligatorio e ACL nuovamente negate. Il successivo canary applicativo autorizzato ha completato Player Italia e Staff Francia con read-after-write reale, cleanup dei baseline e ripristino fail-closed; la closure review repository-only B4 è completata. Il runbook Step 2 è `docs/european-expansion/phase-3c-b4-production-deployment-preflight.md`.

**B4.4 VERCEL FAIL-CLOSED CHECKPOINT — 2026-08-28: PASS.** Il commit applicativo `4825ede71a0cfe49ff84c1aecc85ae12f299ad23` è stato pubblicato con fast-forward sul branch di lavoro. Il deployment Vercel Preview associato ha concluso con stato `success`. Preview e Production contengono entrambi i gate B4.4 esplicitamente impostati a `false`; la allowlist server-only è registrata come Secret e contiene esattamente i due account canary qualificati. Nessun redeploy manuale, merge o deployment Production è stato eseguito in questo checkpoint.


**B4.4 APPLICATION CANARY — 2026-08-28/29: PASS E CLEANUP COMPLETATO.** Sulla sola Preview e per i due account dedicati già qualificati, il grant temporaneo alla RPC protetta dalla database allowlist ha consentito i test owner reali: Player ha salvato e riletto `Italia / Abruzzo / Chieti / Altino`, con canonical IDs e proiezione legacy testuale/ID `81 / 323 / 165`; Staff ha salvato e riletto `Francia / Auvergne-Rhône-Alpes / Ain / Ambérieu-en-Bugey`, con canonical IDs, proiezione testuale estera e legacy ID italiani null. Entrambi i refresh applicativi non hanno mostrato errori. Il read-after-write SQL ha confermato profili attivi, membership canary e valori attesi. Il cleanup transazionale successivo ha riportato tutti i campi residence dei due profili a null, ha preservato la `profile_preferences` Player preesistente con canonical residence null e ha eliminato esclusivamente la `profile_preferences` Staff creata dal test. La verifica finale ha restituito Player `preferences_count=1`, Staff `preferences_count=0`, entrambi i baseline null, due membership canary invariate e `authenticated_execute=false`. UI e write gate Preview sono tornati a `false`, la Preview finale non espone il selector; Production è rimasta fail-closed e non è stata promossa o ridistribuita. B4.4 è **COMPLETATA**; nessun rollout generale è autorizzato.

**B4 CLOSURE REVIEW — 2026-08-29: PASS.** La revisione repository-only ha confermato tutti gli acceptance criteria B4: ruoli e semantiche approvati; payload `absent`, reset, country-only e full coperti; validazione country/area; transazione canonical/legacy; gerarchie IT, FR, ES, CH con/senza District, SI e PL coperte dai test; canary reale Player Italia e Staff Francia; canonical-first read-after-save; interessi, birth country, nationality e relocation invariati; RLS/owner/privacy verificate; legacy Italia senza regressioni; cleanup e stato fail-closed finali verificati. Non restano blocker critici per B4. La FASE 3C-B4 è **COMPLETATA**; ciò non autorizza rollout generale o l'avvio comportamentale di B5.

**ACTIVATION RUNBOOK SAFETY — 2026-08-29.** Il grant RPC non fa parte della sequenza automatica delle migration: `supabase/runbooks/manual/20261204122000_enable_profile_residence_rpc.sql` è un runbook manuale con avviso di approvazione rollout obbligatoria. Il runtime harness lo esegue esplicitamente soltanto nel database locale temporaneo. Production resta con `EXECUTE` revocato e gate UI/write `false`.

#### 3C-B5 — Signup / onboarding

**Stato: COMPLETATA — repository-only.** Signup non raccoglie o scrive geografia. Il role chooser usa una write ristretta al solo `account_type`; `/onboarding` resta un redirect/placeholder e non diventa un nuovo wizard. Player/Athlete, Staff e Fan mantengono residence personale canonica opzionale nei flussi profilo dedicati; Club e Institution mantengono una sede pubblica separata senza scritture in `profile_preferences.residence_*`. Rimosso dal bootstrap il default implicito `interest_country = 'IT'` senza reinterpretarlo come residence. Interessi, residence e sede pubblica restano distinti. Deliverable: `docs/european-expansion/phase-3c-b5-signup-onboarding.md`.

#### 3C-B6 — Geographic interests

**Stato: COMPLETATA — repository-only, verifica manuale non-Production richiesta.** `GET/PATCH /api/profile-geography/interests` e la UI `/settings` integrano `profile_country_interests`, `profile_geo_area_interests` e `open_to_relocation` esclusivamente per Player/Athlete e Staff. Club, Institution e Fan sono esclusi sia dalla UI sia dal boundary server (`403`); nessuna write tocca residence, legacy `interest_*` o sede pubblica. Deliverable: `docs/european-expansion/phase-3c-b6-geographic-interests.md`.

#### 3C-B7 — Compatibility and regression

**Stato: COMPLETATA — repository web/API, verifica manuale Preview richiesta.** Coperti profili legacy Italia; nuovi profili IT, FR, ES, CH, SI e PL; account type; canonical-first; legacy fallback; signup senza default e boundary B6. Il client mobile non è contenuto in questo repository e non è stato modificato; la parity mobile resta separata. Deliverable: `docs/european-expansion/phase-3c-b7-compatibility-regression.md`.

### FASE 3C-C — Opportunities canonical geography

**Stato: COMPLETATA — C1–C7 PASS; BACKFILL PRODUCTION LIMITATO E SMOKE USER-REPORTED PASS.**

Sottofasi previste:

1. C1 — audit schema/write/read;
2. C2 — canonical geography schema;
3. C3 — migration additive;
4. C4 — dual-read/dual-write;
5. C5 — `OpportunityForm`;
6. C6 — filters;
7. C7 — regression/backward compatibility.

L'ownership attuale delle Opportunities deve restare invariata. Non alterare incidentalmente le semantics applicant/club.

#### 3C-C1 — Audit schema/write/read

**Stato: COMPLETATA — PASS repository-only; NESSUNA VERIFICA MANUALE APPLICABILE.** Deliverable: `docs/european-expansion/phase-3c-c1-opportunities-geography-audit.md`.

L'audit ha ricostruito lo schema Opportunity osservabile, i campi testuali legacy `country`/`region`/`province`/`city`, indici, trigger ownership, history RLS, API e repository di lettura/scrittura, `OpportunityForm`, filtri, Search, feed, viste, applications e dipendenze dai profili/sedi pubbliche Club. Il repository non contiene la migration originaria di creazione di `opportunities`: tipi, nullability, grants, policy e trigger effettivamente installati dovranno essere riconciliati in una futura fase autorizzata; C1 non ha eseguito query remote.

Decisioni raccomandate per C2: colonne canonicali nullable `country_id` e `geo_area_id`, coerenza country/area garantita dal database, country-only e geo area a profondità variabile, nessun default Italia, nessuna derivazione automatica da residence/interessi/sede Club e conservazione integrale dei campi testuali. La priorità read proposta è canonical → mapping legacy Italia univoco → testo legacy. Ownership `owner_id`/`created_by`/`club_id` e semantics applications (`athlete_id` legacy compatibile Player/Staff e `club_id` user owner) restano invarianti.

Codice comportamentale: **NON MODIFICATO**. Migration: **NON CREATA, NON TESTATA, NON APPLICATA — non applicabile/vietata in C1**. Production: **NON INTERROGATA E NON MODIFICATA**. Web: audit completato, nessuna UI collegata. Mobile: **NOT STARTED / NON MODIFICATO**. Test repository: `git diff --check`, lint, typecheck e 180 unit test **PASS**; build applicativa bloccata esclusivamente dal mancato download di Inter/Righteous da Google Fonts nell'ambiente, senza errori di codice osservati prima del fetch. Verifica manuale C1: **NESSUNA VERIFICA MANUALE APPLICABILE**. Blocker critici C1: nessuno; decisioni residue e rischi C2–C7 sono enumerati nel deliverable. Prossimo passaggio autorizzabile: **C2**, senza avvio automatico.

#### 3C-C2 — Canonical geography schema

**Stato: COMPLETATA — PASS repository-only; NESSUNA VERIFICA MANUALE APPLICABILE.** Deliverable: `docs/european-expansion/phase-3c-c2-opportunities-canonical-geography-schema.md`.

Il contratto C2 fissa `opportunities.country_id uuid null` e `opportunities.geo_area_id uuid null`, FK dirette verso `countries`/`geo_areas`, check area→country e FK composita country/area. Country-only e selezione di qualunque livello attivo sono ammesse; area senza country e mismatch sono vietati. Delete è `RESTRICT`; non esistono default, backfill o derivazioni da profilo, residence, interessi o sede Club. `country`/`region`/`province`/`city`, ownership, RLS e applications restano invariati.

C2 contiene soltanto il DDL blueprint e i criteri verificabili per C3: **nessuna migration creata, testata o applicata; nessuno schema runtime modificato**. Production: **NON INTERROGATA E NON MODIFICATA**. Web: contratto documentato, nessuna UI o API collegata. Mobile: **NOT STARTED / NON MODIFICATO**. Test repository: `git diff --check`, lint, typecheck e 180 unit test **PASS**. Verifica manuale/visiva: **NESSUNA VERIFICA MANUALE APPLICABILE**. Blocker C2: nessuno. Prossimo passaggio autorizzabile: **C3 — migration additive**, senza avvio automatico.

#### 3C-C3 — Migration additive

**Stato: COMPLETATA — PASS repository-only e PostgreSQL locale; NESSUNA VERIFICA MANUALE APPLICABILE.** Migration: `supabase/migrations/20261205120000_opportunity_canonical_geography.sql`. Deliverable: `docs/european-expansion/phase-3c-c3-opportunities-additive-migration.md`.

La migration aggiunge `country_id` e `geo_area_id` nullable, FK dirette, check area→country, FK composita country/area e indici separati. Non contiene DML, default, backfill, RLS, grant, trigger, function, ownership, applications o modifiche legacy. Country-only e area coerente sono validi; area senza country, mismatch e riferimenti inesistenti sono rifiutati.

Migration testata localmente: **SÌ — PostgreSQL 16.15, PASS**. Il runtime harness con fixture Opportunity legacy/Application ha applicato la migration due volte, verificato idempotenza, integrità, preservazione dati/ownership/applications, rollback e cleanup, con risultato `C3_OPPORTUNITY_GEOGRAPHY_RUNTIME_PASS`. Migration applicata Preview/Production: **NO**. Production: **NON INTERROGATA E NON MODIFICATA**. Web: nessun read/write collegato. Mobile: **NOT STARTED / NON MODIFICATO**. Test: diff-check, lint, typecheck, 184 unit test e runtime locale PASS; build bloccata esclusivamente dal download esterno Google Fonts. Verifica manuale/visiva: **NESSUNA VERIFICA MANUALE APPLICABILE**. Blocker C3: nessuno. Prossimo passaggio autorizzabile: **C4**, senza avvio automatico.

**Aggiornamento operativo successivo autorizzato dall'utente:** migration C3 applicata con risultato `Success. No rows returned`. Stato: **APPLICATA — USER-REPORTED SUCCESS**; target remoto e Production non verificati indipendentemente dall'agente, nessun backfill dichiarato.

#### 3C-C4 — Dual-read / dual-write

**Stato: COMPLETATA — PASS web/API; NESSUNA VERIFICA MANUALE APPLICABILE.** Deliverable: `docs/european-expansion/phase-3c-c4-opportunities-dual-read-write.md`.

Implementato un contratto field-aware `absent`/`legacy`/`reset`/`country_only`/`full`, validazione server di country supported+active, area attiva, country/area e ancestors, proiezione legacy per gerarchie IT/FR/ES/CH/SI/PL e singola statement atomica su `opportunities`. I read espongono canonical, canonical-country, legacy-text o none e usano canonical-first; collection e gerarchie sono caricate in batch. Integrati API collection/item, detail, repository, Search, feed, owner/applications summaries e componenti di presentazione. `OpportunityForm` e filtri canonici restano esclusi rispettivamente fino a C5 e C6.

Migration: nessuna nuova migration C4. C3 applicata secondo comunicazione utente, target non verificato indipendentemente. Production: nessuna query/write eseguita da C4. RLS, grant, trigger, funzioni, ownership, applications, backfill e mobile: **NON MODIFICATI**. Web: dual-read/dual-write implementato, selector non collegato. Test repository: diff-check, lint, typecheck e **191 unit test PASS, 0 FAIL**; build bloccata dal download esterno Google Fonts. Verifica manuale/visiva: **NESSUNA VERIFICA MANUALE APPLICABILE**. Blocker C4: nessuno. Prossimo passaggio autorizzabile: **C5**, senza avvio automatico.

#### 3C-C5 — OpportunityForm

**Stato: COMPLETATA — PASS AUTOMATICO E SMOKE TEST USER-REPORTED PASS.** Deliverable: `docs/european-expansion/phase-3c-c5-opportunity-form.md`.

`OpportunityForm` usa ora il selector canonico riutilizzabile senza default Italia, query legacy dirette o testo libero estero. Supporta geography opzionale, country-only, profondità variabile, reset e payload field-aware. Edit canonical ricostruisce la selezione; edit legacy mostra il testo esistente e lo preserva se non si interagisce, consentendo sostituzione o reset espliciti.

Migration: nessuna nuova. C3 applicata secondo comunicazione utente, target non verificato indipendentemente. Production: nessuna query/write eseguita dall'agente. RLS, grants, ownership, applications, filtri e mobile: **NON MODIFICATI**. Web: form collegato. Test: diff-check, lint, typecheck e **196 unit test PASS, 0 FAIL**; build bloccata dal download esterno Google Fonts. Verifica manuale/visiva: **PASS — confermata dall’utente dopo smoke test**. C5 è COMPLETATA; C6 è stata successivamente autorizzata.


#### 3C-C6 — Filtri

**Stato: COMPLETATA — PASS AUTOMATICO E SMOKE TEST PREVIEW USER-REPORTED PASS.** Deliverable: `docs/european-expansion/phase-3c-c6-opportunity-filters.md`.

La pagina Opportunities usa il selector canonico con URL `countryId`/`geoAreaId`. La GET valida country/area e filtra per country oppure per area più discendenti attivi; i canonical filters hanno precedenza, mentre i vecchi URL testuali restano supportati quando gli ID non sono presenti. Nessun default Italia.

Migration: nessuna nuova; C3 user-reported applied. Production: non interrogata/modificata. RLS, grants, trigger, ownership, applications e mobile: **NON MODIFICATI**. Web: filtri implementati e smoke Preview **PASS** su conferma utente; una nuova Opportunity canonica estera è filtrabile correttamente. Test: diff-check, lint, typecheck e **199 unit test PASS, 0 FAIL**; build bloccata esclusivamente dal download esterno Google Fonts.

Lo smoke ha anche confermato che le Opportunities storiche con soli campi testuali restano visibili senza filtro ma non entrano in un filtro canonico ID-based. È un rischio dati atteso, non risolvibile con mapping fuzzy: prima del rollout definitivo C7 (o un checkpoint dati esplicitamente autorizzato) deve produrre report read-only, resolver deterministico/univoco, backfill idempotente, dry-run, rollback e gestione manuale degli ambigui. Il piano va preparato e provato prima del merge; l'applicazione non va concentrata in una migration completa last-minute e non è autorizzata da questo aggiornamento. Prossimo passaggio autorizzabile: **C7**, senza avvio automatico.


#### 3C-C7 — Regressione e backward compatibility

**Stato: COMPLETATA — PASS REPOSITORY, POSTGRESQL LOCALE, APPLY/POST-AUDIT E SMOKE PRODUCTION USER-REPORTED.** Deliverable: `docs/european-expansion/phase-3c-c7-opportunities-regression-backward-compatibility.md`.

Creati audit read-only, piano deterministico, apply transazionale manuale e rollback explicit-ID per le Opportunities legacy italiane. Il resolver usa soltanto country alias espliciti e gerarchia esatta Municipality/Province/Region; match univoci ricevono country+area, ambigui e unresolved soltanto country IT. Nessuna label legacy, ownership o Application viene modificata. Il runbook resta fuori dalle migration automatiche.

Test locale PostgreSQL 16.15: **PASS**, inclusi Subiaco/RM/Lazio, ambigui, unresolved, preservazione estero/ownership/applications e idempotenza; risultato `C7_OPPORTUNITY_BACKFILL_RUNTIME_PASS`. Test statici e suite repository: typecheck, lint e **207 unit test PASS, 0 FAIL**. Migration automatica: nessuna. Production non interrogata/modificata dall’agente; audit, apply e smoke successivi sono user-reported e documentati sotto. Web: regressione repository e smoke PASS. Mobile: NOT STARTED / NON MODIFICATO.

**Aggiornamento blocker C7:** non esiste un Preview Branch Supabase healthy collegato alla PR; `b4-rpc-validation` è UNHEALTHY e non autorizzato, il check resta QUEUED e Support non ha ancora risolto. Preparato senza eseguirlo `audit_opportunity_legacy_geography_production_read_only.sql`: singolo statement CTE/SELECT, nessuna temp table/DML/DDL/lock, output limitato ai cinque conteggi e privo di UUID/dati personali. In quel checkpoint nessuna query Production, apply o backfill era stata eseguita; il successivo audit read-only user-reported è documentato sotto. C7 resta CONDITIONAL PASS e le fasi successive restano ferme.

**Esito audit Production read-only comunicato dall'utente:** `municipality=31`, `province=0`, `region=0`, `ambiguous_country_only=0`, `unresolved_country_only=0`; totale 31. Tutte le Opportunity legacy italiane osservate hanno quindi un match Municipality deterministico e non esiste una coda ambigua/unresolved nel momento dell'audit. È stato eseguito esclusivamente lo statement read-only; nessun apply, backfill o write. Il prossimo passaggio raccomandato, ancora non autorizzato, è preparare/revisionare un apply transazionale che ricalcoli e richieda esattamente i conteggi approvati prima di qualsiasi UPDATE, con allowlist rollback; poi serviranno nuova autorizzazione, post-audit e smoke. C7 resta CONDITIONAL PASS.

**Apply fail-closed preparato, non eseguito:** `apply_opportunity_legacy_geography_production_fail_closed_31.sql` ricalcola il piano sotto advisory transaction lock e abortisce salvo esattamente 31/0/0/0/0; richiede target Municipality attivi/coerenti, emette allowlist rollback, modifica soltanto `country_id`/`geo_area_id` e verifica il post-update. Runtime PostgreSQL 16.15 su 31 fixture: PASS; preservati testi legacy, ownership e Application, rerun con piano diverso rifiutato fail-closed, risultato `C7_PRODUCTION_FAIL_CLOSED_GATE_PASS`. Nessuna esecuzione Production è stata effettuata. Prossimo passaggio autorizzabile: esecuzione Production separata del solo candidato, poi post-audit e smoke; C7 resta CONDITIONAL PASS.

**Chiusura Production user-reported:** eseguito una sola volta dal commit remoto autorizzato `e8b4a6f2d23254ff8f1066007b9c575813b4b94e` il solo apply fail-closed, con backup fisico restore-ready verificato, exit code 0 e 31 Municipality aggiornate. Allowlist conservata privatamente. Post-audit: tutte le cinque categorie a zero. Smoke: “Juniores Regionale”, “Opportunité Ain”, lista, detail, edit senza salvataggio, Applications e console tutti PASS. C7 e FASE 3C-C sono COMPLETATE; nessuna fase successiva o merge è autorizzato implicitamente.

### FASE 3C-D — Search / Discover / WhoToFollow

**Stato: COMPLETATA / PASS — D1–D7 concluse.**

Obiettivi futuri: country-aware filtering, geo-area filtering, scouting internazionale, country interests, territorial interests, relocation e ranking compatibile con legacy. Il lavoro dovrà essere separato, secondo necessità, in sottofasi audit/read/filter/ranking.

Piano progressivo approvato per evitare modifiche monolitiche:

1. **D1 — audit Search / Discover / WhoToFollow:** COMPLETATA / PASS; inventariati Search globale, due endpoint suggerimenti, superfici UI, fonti canonical/legacy, RLS/privacy, ranking e rischi performance. Nessuna modifica runtime, remota, mobile o binaria.
2. **D2 — canonical filtering/ranking contract:** COMPLETATA / PASS; definiti parametri ID e alias, parsing fail-closed, validation adapter, descendants, reason weights, ranking/tie-break deterministico, privacy boundary e fallback legacy. Modulo puro non ancora collegato al runtime; verifica manuale/visiva non applicabile.
3. **D3 — Search canonical filters:** COMPLETATA / PASS; API canonical-first con country/area validation, semantica descendants bounded tramite proiezione gerarchica, query/count coerenti e fallback legacy. Recheck Preview PASS dopo la correzione del fan-out.
4. **D4 — Discover / WhoToFollow data boundary:** COMPLETATA / PASS; piano geografico condiviso, preference viewer-only via RLS, target location pubblica e smoke autenticato concluso.
5. **D5 — international ranking e relocation:** COMPLETATA / PASS; score D2 attivo sul pool visibile con interessi country/area, sport, relocation esplicita, fallback legacy e tie-break stabile; smoke deterministico autenticato concluso.
6. **D6 — UI e scouting internazionale:** COMPLETATA / PASS; selector canonicale, URL country/area, filtri server fail-closed, copy IT/EN/FR/ES, accessibilità e reason label non sensibili; smoke user-reported PASS.
7. **D7 — regressione e backward compatibility:** COMPLETATA / PASS; account type, sei Paesi, profili legacy, privacy/RLS, visibility, follow exclusions, conteggi, performance e smoke Preview conclusi.

Decisioni D1: gli interessi canonici descrivono le preferenze del viewer e non la location del target; la location target usa residence canonicale con fallback legacy. `open_to_relocation` è un segnale contestuale, non un filtro universale di pubblicazione. Le preference tables sono own-or-admin nel contratto repository e non devono essere rese pubbliche o aggirate con service role generalizzato. SearchMap/ClubMap restano fuori perimetro fino alla FASE 3C-E. Dettaglio e matrice di rischio sono nel deliverable `phase-3c-d1-search-discover-who-to-follow-audit.md`.

Decisioni D2: filtri canonicali `countryId`/`geoAreaId` hanno precedenza sui testi legacy, area richiede country e include descendants same-country; assenza canonicale non penalizza i profili legacy. Il ranking usa una sola reason geografica più segnali sport/relocation espliciti e tie-break stabile. D2 non attiva ancora query o ranking. Dettaglio nel deliverable `phase-3c-d2-search-canonical-filtering-ranking-contract.md`.

Decisioni D3: Opportunities filtrano direttamente il country ID canonico e usano la proiezione gerarchica bounded dell'area validata; profili e author usano la stessa proiezione pubblica senza leggere preference tables private o usare service role. Il primo smoke area ha rilevato `UNKNOWN` perché materializzare migliaia di descendant UUID in PostgREST superava la dimensione pratica della richiesta; la correzione evita il fan-out e il recheck Preview è PASS. Dettaglio e checklist in `phase-3c-d3-search-canonical-filters.md`.

Decisioni D4: entrambi gli endpoint suggerimenti usano un unico boundary viewer-only con precedenza interessi area/country canonici, interessi legacy, residence canonica e residence legacy. I candidati sono filtrati soltanto sulla location pubblica; i loro interessi non vengono interpretati come posizione. Relocation resta metadato e non attiva ranking prima di D5. Dettaglio e checklist in `phase-3c-d4-discover-who-to-follow-data-boundary.md`.

Decisioni D5: il ranking D2 è applicato soltanto dopo visibility ed eligibility, senza modificare il pool autorizzato. Una sola reason geografica contribuisce; sport e relocation sono additivi. Relocation richiede opt-in del viewer, interesse esplicito, residence country nota e target in country differente. Nessun dato mancante produce penalità. Dettaglio e checklist in `phase-3c-d5-international-ranking-relocation.md`.

Decisioni D6: la selezione esplicita di scouting usa `countryId`/`geoAreaId`, prevale sul piano viewer e non consente fallback fuori territorio. In assenza di selezione resta il comportamento personalizzato D4/D5. Le card espongono solo reason generiche non sensibili; score e preferenze restano server-side. Dettaglio e checklist in `phase-3c-d6-ui-international-scouting.md`.

Decisioni D7: entrambi gli endpoint suggerimenti applicano `active + published`; pending/draft/null-status non sono candidati pubblici. La matrice automatica copre sei Paesi, alias, legacy eligibility, account type, privacy, query bounded e localizzazione. Dettaglio e smoke finale in `phase-3c-d7-regression-backward-compatibility.md`.

Chiusura D7 user-reported: entrambi gli endpoint suggerimenti hanno restituito HTTP 200 con ordine stabile in esecuzioni ripetute, `rankingVersion=d5-v1`, esclusioni self/already-followed e nessun `UNKNOWN`. Il pool WhoToFollow alternativo è passato a 421 profili pubblici visibili e 414 eleggibili, coerentemente con il boundary `active + published`. Lo smoke UI D6 su `/discover`, card, avatar, link e Follow resta PASS. FASE 3C-D è pertanto COMPLETATA; Maps non è avviata implicitamente.

### FASE 3C-E — Maps

**Stato: COMPLETATA / PASS LATO WEB — E1–E7 PASS.**

Obiettivi: `ClubMap`, `SearchMap`, supporto internazionale, viewport canonico, coordinate puntuali pubbliche, stadium coordinates, fallback legacy, privacy e performance. E1 ha confermato `club_stadium_lat/lng` come sorgente preferibile per Club/Institution e ha separato i centroid/bounds canonici, validi per viewport, dai pin pubblici. Ha inoltre rilevato SearchMap disattivata tramite redirect, precedenza coordinate divergente, stadium-only esclusi dai bounds, fallback fuori viewport, rischio privacy per coordinate personali, popup storico non sanitizzato e limiti di scalabilità/provider. Dettaglio in `phase-3c-e1-maps-audit.md`.

Piano completato: **E1 audit** PASS; **E2 coordinate/viewport/privacy contract** PASS; **E3 server data boundary** PASS; **E4 ClubMap internazionale** PASS; **E5 SearchMap decision e integrazione** PASS; **E6 Opportunity map semantics** PASS; **E7 regressione/performance/provider/backward compatibility** PASS.

Decisioni E2: pin precisi pubblici organization-only, con precedenza atomica venue → legacy; nessun pin implicito per Player/Staff/Fan. Viewport e pin sono modelli separati; bounds espliciti o canonical country/area sono mutuamente esclusivi, fail-closed e antimeridian-aware. Centroid canonici non sono pin. Le Opportunity usano venue propria, poi venue owner, altrimenti nessun pin. Dettaglio in `phase-3c-e2-coordinate-viewport-privacy-contract.md`.

Decisioni E3: i tre endpoint Maps condividono adapter viewport e resolver organization-only; query venue-first includono stadium-only, sono antimeridian-aware e non effettuano fallback globale fuori viewport. Player/Staff/Fan non espongono pin precisi; Opportunity ereditano soltanto il punto pubblico owner da un pool bounded. SearchMap resta disattivata. Dettaglio e smoke in `phase-3c-e3-maps-server-data-boundary.md`.

Decisioni E4: ClubMap usa viewport europeo, selector canonicale URL-stable e fit dei bounds server; nessun default Italia. I pin vengono raggruppati client-side a zoom basso senza provider aggiuntivi. Copy e accessibility sono localizzati IT/EN/FR/ES; il boundary organization-only E3 resta invariato. Dettaglio e smoke in `phase-3c-e4-club-map-international.md`.

Correzione smoke E4: quando il catalogo non dispone dei bounds ufficiali, il server valida la gerarchia canonicale e filtra i campi pubblici legacy `country`/`region`/`province`/`city`; non esiste più il fallback globale che mostrava tutta Italia per Roma. Lo zoom non rilancia la richiesta dati e nessun bounds o punto personale viene fabbricato. Il successivo smoke Preview è PASS.

Decisioni E5: una sola UI Maps pubblica, `/club-map`. `/search-map` è conservata come redirect compatibile verso ClubMap; CTA runtime aggiornate e client SearchMap storico irraggiungibile rimosso insieme alla lista/service privati. Gli endpoint server Maps restano protetti per E6/E7; nessun pin personale o Opportunity UI viene attivato. Dettaglio in `phase-3c-e5-search-map-decision-integration.md`.

Decisioni E6: una Opportunity è mappabile soltanto tramite venue esplicita futura o punto pubblico validato dell'organizzazione owner; canonical country/area resta metadata/viewport e non diventa mai un pin. `/api/search/map?type=opportunity` allega geography, esclude placement null ed espone un contratto/versione espliciti. Dettaglio in `phase-3c-e6-opportunity-map-semantics.md`.

Correzione smoke E6: il primo HTTP 200 ha confermato contratto e bounds, ma il risultato vuoto con `boundsApplied=true` ha evidenziato la compatibilità tra ID profilo e ID Auth nelle Opportunity legacy. Il pool owner indicizza ora il punto pubblico tramite `profiles.id` e `profiles.user_id` e risolve `club_id`/`owner_id`/`created_by`, restando bounded e organization-only. Recheck Preview richiesto prima di E7.

Chiusura E6: il recheck debug ha restituito `totalOpenOpp=0`, `clubsInBoundsCount=38`, `oppAfterBounds=0`, contratto E6 presente e nessun errore. Non esistono Opportunity open visibili al caller da validare per-item; la lista vuota è corretta e il boundary è PASS.

Decisioni E7: provider/versione/attribution e cap pubblici centralizzati; endpoint Club espone limite/returned/truncated senza count aggiuntiva. Matrice regressiva preserva canonical filtering, privacy, spatial strictness, E5 redirect ed E6 placement. Dettaglio in `phase-3c-e7-maps-regression-performance-provider.md`.

Chiusura E7 user-reported: endpoint Club HTTP 200 con 38 pin organization venue e metadata `1000/38/false`; endpoint Player HTTP 200 con lista vuota, privacy boundary e viewport esplicito corretti. Gli smoke UI/redirect/filter/cluster/Network E4–E6 restano PASS. FASE 3C-E Maps è pertanto COMPLETATA lato Web.

Perimetro Mobile: tutte le implementazioni e certificazioni 3C svolte finora appartengono esclusivamente a questa repository Web. La replica dei contratti e dei comportamenti in Mobile sarà eseguita successivamente nella repository Mobile come attività separata; nessuna chiusura Web equivale a Mobile parity.

## FASE 4 — Internationalization / i18n

**Stato: COMPLETATA / PASS — 4A–4I concluse, incluso smoke finale Preview dichiarato PASS dall'utente.**

Il repository contiene un'implementazione i18n sostanziale ed è quindi più avanzato rispetto alla precedente dicitura `NOT STARTED`: sono verificabili catalogo `languages`, preferred language in `profile_preferences`, infrastruttura locale/provider, messaggi per le lingue attive e test dedicati. Queste evidenze non equivalgono tuttavia alla certificazione completa della FASE 4.

L'audit dedicato di riconciliazione 4A è stato completato repository-only senza modifiche runtime, database o Mobile. Ha confermato la foundation esistente e identificato gap in copertura globale delle stringhe, classificazione dei locale italiani residui, review linguistica, test end-to-end e metadata/SEO. Dettaglio in `phase-4a-i18n-audit.md`.

4B ha certificato la foundation server/client, la precedenza profile → cookie → browser → italiano, caricamento cataloghi, persistenza owner-scoped e parità delle chiavi. Le primitive pure di interpolazione/fallback sono state consolidate fuori dal provider React mantenendo gli export compatibili. Nessuna migration, API, route, lingua attiva o modifica Mobile. Dettaglio in `phase-4b-i18n-infrastructure.md`. La FASE 4 non è completata.

4C ha consolidato la baseline italiana sulle superfici prioritarie Rete, Candidature, dettaglio Opportunity e pagina informativa località. Lo smoke user-reported ha chiuso la baseline italiana e rilevato un follow-up responsive sul CTA francese delle Candidature. La candidate 4D corregge il CTA come unità `inline-flex` non spezzabile, localizza le intestazioni residue della tabella e certifica le chiavi inglesi prioritarie; resta necessario lo smoke inglese e il recheck francese documentato in `phase-4d-english.md`.

4D è stata chiusa dopo conferma dello smoke Preview. 4E consolida ora la baseline francese sulle stesse superfici, protegge il CTA lungo già verificato e applica una revisione editoriale mirata senza cambiare contratti o chiavi. Dettaglio e checklist manuale in `phase-4e-french.md`.

4E è stata chiusa dopo lo smoke Preview, con un residuo cross-locale sui valori controllati provenienti dal database. 4F corregge quel residuo in presentazione per tutte le lingue attive e consolida la baseline spagnola. Dettaglio e checklist in `phase-4f-spanish.md`.

4F è stata chiusa dopo lo smoke Preview. 4G estende la traduzione degli sport a tutti i selettori Web preservandone i valori e consolida la persistenza della lingua con serializzazione e rollback coerente. Dettaglio in `phase-4g-language-preference.md`.

4G è stata chiusa dopo lo smoke Preview. 4H corregge i residui UI segnalati, localizza tutti i ruoli Staff legacy e introduce metadata server-side coerenti con la lingua senza dichiarare URL `hreflang` inesistenti. Dettaglio in `phase-4h-metadata-seo.md`.

4H è stata chiusa dopo lo smoke Preview. 4I corregge selector geografico e MyMedia, certifica fallback e placeholder ed è stata chiusa dopo la dichiarazione di PASS dello smoke finale. La FASE 4 è pertanto conclusa. Prima della FASE 5 resta un gate operativo separato per decidere ed eseguire il merge controllato, senza confondere la validazione Web con la futura parity Mobile. Dettaglio in `phase-4i-fallback-regression.md`.

Roadmap prevista:

- 4A — audit strings/locales — **COMPLETATA**;
- 4B — i18n infrastructure — **COMPLETATA**;
- 4C — Italian baseline — **COMPLETATA**;
- 4D — English — **COMPLETATA**;
- 4E — French — **COMPLETATA**;
- 4F — Spanish — **COMPLETATA**;
- 4G — language preference integration — **COMPLETATA**;
- 4H — metadata/SEO — **COMPLETATA**;
- 4I — fallback/regression — **COMPLETATA / PASS**.

Lingue iniziali: **IT, EN, FR, ES**. Lingue future: **PT, DE**. Non risultano dichiarate traduzioni complete.

## FASE 5 — Sports / Disciplines / Competition Model

**Stato: IN CORSO — 5A–5C e 5D-A–5D-E-A COMPLETATE; FIGC SOURCE BLOCKED; FRANCIA PASS METODOLOGICO; SPAGNA RICOGNIZIONE COMPLETATA/REVIEW PENDING; CH/SI/PL E 5E–5J NOT STARTED.**

### FASE 5A — Audit Sports / Disciplines / Competitions

**Stato: COMPLETATA — AUDIT repository-only; NESSUNA MODIFICA COMPORTAMENTALE.** Deliverable: `docs/european-expansion/phase-5a-sports-disciplines-competition-audit.md`.

L'audit conferma che la foundation è soltanto parziale: `sports`, `sport_disciplines`, `sport_variants` e `legacy_sport_mappings` esistono, ma i read/write path di profili, esperienze, Club, roster, Staff, Opportunities, Search, Discover, WhoToFollow, feed e Maps continuano a usare stringhe legacy. Discipline e variant sono popolati soltanto per football/futsal; non esistono cataloghi canonici per sports organization, competition, level/group, age class, season, format o territorial scope. Ruoli e categorie sono array applicativi, prevalentemente italiani; la controlled vocabulary traduce soltanto la presentazione e non costituisce identity canonica.

Codice/schema/API/UI: **NON MODIFICATI**. Migration 5A: **NON CREATA, NON TESTATA, NON APPLICATA**. Production: **NON INTERROGATA E NON MODIFICATA**. RLS, grant, ownership e Applications: **NON MODIFICATI**. Web/API: nessun impatto comportamentale. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**; la replica Mobile fino alla FASE 4 è registrata come **USER-REPORTED**, non verificata da questa repository. Verifica manuale/visiva: **NON APPLICABILE**. Test automatici: `git diff --check` PASS, 293 unit test PASS, lint PASS e typecheck PASS; build bloccata esclusivamente dal mancato fetch esterno di Inter/Righteous da Google Fonts, senza errore applicativo osservato. Rischi principali: mismatch sport/ruolo, categorie italiane non generalizzabili, label localizzata scambiata per valore persistito, legacy unknown, Staff trasversale, catene discipline incoerenti, competizioni omonime, season format diversi, filtri testuali e compatibilità Mobile/Italia.

Prossimo passaggio autorizzabile: **5B — contratto canonico e regole di compatibilità**, esclusivamente documentale e senza DDL/DML/runtime; autorizzata successivamente dall'utente e completata come riportato sotto.

### FASE 5B — Contratto canonico e regole di compatibilità

**Stato: COMPLETATA — IMPLEMENTATA E TESTATA come contratto documentale repository-only.** Deliverable: `docs/european-expansion/phase-5b-canonical-sports-competition-contract.md`.

5B separa identity UUID/code language-neutral dalle label; distingue Sport/Discipline/Variant, PlayerPosition, StaffRole e applicability, SportsOrganization, Competition, CompetitionEdition, CompetitionLevel/Group, Season, AgeClass, GenderCategory, CompetitionFormat e TerritorialScope. Fissa catene coerenti e country-aware, inclusi scope multi-country, season annuali/cross-year/split e ruoli Staff trasversali.

Compatibility: read `canonical → legacy mapping univoco → raw legacy`; riferimenti canonicali invalidi restano osservabili. Write field-aware `absent/legacy/canonical/reset`, senza reset impliciti, default Italia/Calcio, traduzioni persistite o mapping euristici. Payload futuri esclusivamente additivi; campi legacy, ownership/visibility Opportunity, Applications, RLS e privacy Maps restano invariati.

Codice/schema/API/UI: **NON MODIFICATI**. Migration 5B: **NON CREATA, NON TESTATA, NON APPLICATA**. Production: **NON INTERROGATA E NON MODIFICATA**. RLS, grant, ownership e Applications: **NON MODIFICATI**. Web/API: nessun impatto comportamentale. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**; replica fino a FASE 4 soltanto user-reported. Verifica manuale/visiva: **NON APPLICABILE**. Test: `git diff --check`, 293 unit test, lint e typecheck PASS; build bloccata esclusivamente dal fetch esterno Google Fonts. Prossimo passaggio autorizzabile: **5C**, successivamente autorizzata e completata nel repository come riportato sotto.

### FASE 5C — Schema additivo e migration

**Stato: COMPLETATA — IMPLEMENTATA E TESTATA SU POSTGRESQL 16.15 LOCALE; APPLICATA E REGISTRATA IN PRODUCTION CON POST-APPLY PASS.** Migration: `supabase/migrations/20261206120000_canonical_sports_competition_schema.sql`. Deliverable: `docs/european-expansion/phase-5c-additive-sports-competition-migration.md`.

Lo schema additivo crea 19 oggetti per posizioni/ruoli e applicability, organizzazioni/membership country, gender/format/territorial scope, level, age class, season, competition, edition, group, scope geografici e mapping legacy. FK composite preservano Sport→Discipline→Variant e organization/sport/season; tre trigger `SECURITY INVOKER` bloccano cicli. Non sono aggiunte colonne a profili, esperienze, Opportunities o Applications.

Migration creata: **SÌ**. Testata: **SÌ — due apply reali e fixture su PostgreSQL 16.15 locale, PASS**. Applicata Preview/Production: **NON CERTIFICATA / SÌ, user-executed**. Production: **INTERROGATA E MODIFICATA**, limitatamente ai 19 oggetti 5C e alla relativa riga history, con post-apply PASS. Seed/backfill: **NO/NO**. RLS/grant: **MODIFICATI soltanto sui nuovi oggetti 5C**, con read anon/authenticated, write admin-scoped e service role; policy/grant esistenti invariati. Ownership e Applications: **NON MODIFICATI**. Web/API/UI: remediation presentation-only completata e smoke user-reported PASS. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Test repository 5C: runtime PostgreSQL locale PASS, unit test/lint/typecheck/diff-check PASS; il build storico è stato bloccato esclusivamente dal fetch esterno Google Fonts.

Il successivo apply remoto 5C è stato autorizzato ed eseguito con i gate documentati sotto. Il passaggio successivo è **5D — cataloghi e seed controllati**, avviato con l'audit 5D-A dopo autorizzazione esplicita.

**FOLLOW-UP PREVIEW MIGRATION HISTORY — AUDIT COMPLETATO / BLOCKED.** Il Preview branch `phase-5c-validation` fallisce user-reported con PostgreSQL `42P01` nella prima migration repository `20250221090000_add_club_id_to_opportunities.sql`: esegue `ALTER TABLE public.opportunities` ma nessuna migration versionata crea prima o dopo la tabella base. L'audit completo rileva inoltre altre baseline entity assenti o create dopo il primo utilizzo (`profiles`, `clubs`, `saved_views`, `posts`, geografia legacy; `notifications`, `follows` e `applications` fuori ordine). Il sorter Preview è corretto; è la history a dipendere da uno schema pre-repository.

Correzione raccomandata: baseline pre-`20250221090000` ricostruita da evidenza storica e audit Production read-only, poi full replay locale, schema/security diff e nuovo Preview. Non aggiungere `IF EXISTS`, non creare una Opportunity parziale nella migration incriminata e non riscrivere migration applicate. Deliverable: `docs/european-expansion/phase-5c-preview-migration-history-diagnosis.md`.

Test audit: `git diff --check`, 296 unit test, lint e typecheck PASS; build bloccata esclusivamente dal fetch esterno Google Fonts. Production: **NON INTERROGATA E NON MODIFICATA**. La 5C resta condizionatamente applicabile a Production indipendentemente dal repair Preview perché non usa `opportunities`, ma soltanto dopo preflight read-only su foundation, collisioni, ACL/history e con autorizzazione mutativa separata; post-apply obbligatori 19 tabelle, conteggi zero, RLS 19/19, 76 policy, tre trigger e smoke senza HTTP 500. 5D resta **NOT STARTED / NON AUTORIZZATA**.

**P+B READ-ONLY AUTORIZZATO — ESECUZIONE BLOCCATA DALL'AMBIENTE.** È stato predisposto `scripts/sports/reports/phase-5c-production-preflight-and-baseline-audit-read-only.sql`, protetto da transazione read-only e rollback, con test fail-closed. L'ambiente non dispone di Supabase CLI/`psql`, variabili di connessione o password utilizzabile: Production e migration history **NON SONO STATE INTERROGATE**, quindi preflight/collisioni/dipendenze restano **NOT EXECUTED**, non PASS/FAIL. Test aggiornati: 299 unit test PASS. È richiesta l'esecuzione umana del report nel SQL Editor Production o una connessione autenticata fornita fuori banda; nessun output va confuso con autorizzazione all'apply.

**P+B v1 ESEGUITO IN PRODUCTION — USER-REPORTED READ-ONLY / OUTPUT PARZIALE.** L'esecuzione è terminata senza errori, ma SQL Editor ha restituito per la copia soltanto il result set finale con cinque view; ciò non consente ancora PASS/FAIL. Il report è ora `phase-5c-pb-v2` e restituisce un unico JSON consolidato con classification, blocking reasons, history, prerequisiti, collisioni e baseline evidence. Validazione PostgreSQL 16.15 sintetica e 300 unit test PASS. Production modificata: **NO**. Verifica umana richiesta: rerun integrale v2 e copia dell'unica cella JSON.

**P+B v2 PRODUCTION — PASS USER-REPORTED / APPLY NON ESEGUITO.** Il JSON consolidato riporta zero blocker, tutte le dipendenze/tipi/key/ruoli compatibili e zero collisioni sui 19 oggetti, funzioni, trigger e indici 5C. La history remota è disponibile ma contiene soltanto `20250221090000`; il confronto con 122 file locali lascia 121 file (120 versioni distinte) non registrati e rileva la versione locale duplicata `20260720103000`. Un normale `supabase db push` non è selettivo e potrebbe validare/tentare l'intero insieme storico: è quindi **VIETATO**, anche dopo la 5C, finché history e baseline non saranno riconciliate.

È definito un solo percorso di apply esclusivo: esecuzione diretta del file 5C verificato tramite SHA-256 e `psql`, controlli read-only 19/19, quindi registrazione della sola versione con `supabase migration repair 20261206120000 --status applied --linked`. Comandi e failure handling sono nel deliverable `docs/european-expansion/phase-5c-production-exclusive-apply-plan.md`; **non sono stati eseguiti**. Migration applicata: **NO**. Production interrogata/modificata: **SÌ user-reported read-only / NO**. RLS/grant/ownership/Applications/backfill modificati: **NO**. Web/API/UI: nessun impatto. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Verifica umana attuale: approvazione separata del runbook; dopo l'eventuale apply saranno obbligatori history, 19 tabelle/RLS, 76 policy, tre trigger, conteggi zero e smoke Web/API Console/Network. Baseline repair e FASE 5D restano **NOT STARTED / NON AUTORIZZATI**.

**5C PRODUCTION APPLICATA — DATABASE PASS / SMOKE WEB/API PENDING.** L'utente ha applicato esclusivamente il file con SHA-256 `28a396be4616ea6dba57482946af5c15ec8df579ebb4ad4ca6947309e8d60bf7` tramite `psql`; esecuzione conclusa con `COMMIT`. Il controllo read-only post-apply ha restituito 19 tabelle, RLS 19/19, 76 policy, tre funzioni, tre trigger abilitati, grant attesi e zero righe catalogo. È stato quindi eseguito esclusivamente `migration repair 20261206120000 --status applied --db-url ...`; il controllo finale read-only ha restituito `PASS_PHASE_5C_HISTORY_REGISTERED`, due righe history totali e una sola occorrenza per `20250221090000` e `20261206120000`, seguito da `ROLLBACK` e rimozione delle variabili di connessione.

Migration creata/testata/applicata: **SÌ / SÌ / SÌ PRODUCTION, user-executed**. Production interrogata/modificata: **SÌ / SÌ, limitatamente ai 19 nuovi oggetti 5C e alla singola riga history autorizzata**. RLS/grant: **APPLICATI soltanto ai nuovi oggetti 5C**. Ownership, Applications, tabelle runtime e backfill: **NON MODIFICATI**. Web/API/UI: nessuna modifica repository o comportamento intenzionale; smoke umano ancora **PENDING**. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. `db push` resta vietato e le 120 versioni intermedie non sono state riparate. Baseline repair e FASE 5D: **NOT STARTED / NON AUTORIZZATI**. È sicuro chiudere la sessione e riprendere dallo smoke in una giornata successiva.

**5C-S1 SMOKE LOCALIZATION REMEDIATION — IMPLEMENTATA / RECHECK PENDING.** Lo smoke utente ha rilevato copy strutturale non localizzato in mini-card Player, preferred side, eventi Institution, Opportunities e Discover/Following. Le correzioni sono presentation-only, preservano i valori persistiti e non cambiano API o dati. I Paesi globali della zona d'interesse Staff restano disponibili per compatibilità legacy, ma le label seguono ora la lingua; un eventuale restringimento canonicale è rinviato alla 5F. Deliverable: `docs/european-expansion/phase-5c-s1-smoke-localization-remediation.md`. Migration/Production/RLS/grant/ownership/Applications/Mobile: **NON MODIFICATI** in S1. Console e Network non sono stati verificati dall'utente e restano un gate esplicito. FASE 5D resta **NOT STARTED / NON AUTORIZZATA**.

**5C-S1.1 PROFILE EDIT RUNTIME FIX — IMPLEMENTATA / RECHECK PENDING.** Il primo recheck Player si è fermato con `invalid_argument`: la causa riprodotta è il pseudo-country applicativo `OTHER` passato a `Intl.DisplayNames.of()`, che accetta soltanto codici regione validi. È stato introdotto un resolver fail-safe che localizza `OTHER`, usa DisplayNames per gli ISO e preserva il fallback per legacy unknown. Nessuna migration, query/write Production, modifica API/RLS/grant/ownership/Applications/Mobile. Riprendere lo smoke dal punto 2 dopo il nuovo deploy; 5D resta non autorizzata.

**5C-S1.2 INSTITUTION/PLAYER/CLIENT REMEDIATION — IMPLEMENTATA / RECHECK PENDING.** Il secondo smoke conferma Player Edit ma rileva interpolazioni/map helper italiani in Institution Edit e controlled vocabulary/fallback italiani nel Player pubblico. Sono stati localizzati senza modificare valori persistiti; ProfileMiniCard riusa il singleton Supabase browser per evitare un client Auth diretto aggiuntivo. Network user-reported: richieste applicative osservate 200/204, nessun 4xx/5xx visibile. Gli errori `ZERO_PHISHING/content_script.js` appartengono a un'estensione browser; il warning GoTrue è applicativo e richiede recheck Incognito dopo deploy. Migration/Production/API/RLS/grant/ownership/Applications/Mobile: non modificati. 5D resta non autorizzata.

**5C-S1.3 CLUB PUBLIC PROFILE REMEDIATION — IMPLEMENTATA / RECHECK FINALE PENDING.** Il profilo Club localizza ora sport e category legacy tramite controlled vocabulary e il solo nome del Paese tramite locale. Città, regione/provincia, impianto e indirizzo restano toponimi/contenuto utente e non vengono tradotti. Nessuna migration o modifica Production/API/RLS/grant/ownership/Applications/Mobile. Dopo PASS del recheck Club e Console/Network la 5C-S1 potrà essere chiusa e 5D proposta per autorizzazione separata.

**5C-S1 CHIUSA — PASS USER-REPORTED.** L'utente ha confermato il recheck finale dopo la localizzazione del profilo Club e ha autorizzato esplicitamente la FASE 5D. I toponimi e gli indirizzi restano contenuto proprio e non vengono tradotti; sport, category e Paese sono presentation-only localizzati. Nessuna ulteriore migration o modifica Production è stata richiesta dalla remediation.

### FASE 5D — Cataloghi e seed controllati

**Stato: IN CORSO — 5D-A–5D-E-A COMPLETATE; FIGC SOURCE BLOCKED; 5D-E-R-FR PASS METODOLOGICO; 5D-E-R-ES COMPLETATA/REVIEW PENDING; CH/SI/PL NON INIZIATI.**

#### FASE 5D-A — Audit fonti, cataloghi e strategia seed

**Stato: COMPLETATA — AUDIT repository-only; NESSUNA MODIFICA COMPORTAMENTALE.** Deliverable: `docs/european-expansion/phase-5d-a-controlled-catalog-seed-audit.md`.

L'audit distingue la foundation FASE 1 già seedata, i candidate interni (posizioni Player, ruoli Staff e piccoli controlled vocabulary) e i cataloghi che richiedono fonti primarie/versionate (organizzazioni, livelli, classi d'età, stagioni, competizioni, edizioni e gruppi). `CATEGORIES_BY_SPORT` non è importabile: mescola competition, level, age class, organizer e fallback ed è prevalentemente italiano. È richiesto un manifest fail-closed con provider, source identity/version, licenza, attribuzione, validità, checksum, conteggi e relazioni per code; nessun UUID ambientale o mapping fuzzy.

Codice/schema/API/UI: **NON MODIFICATI**. Migration e seed 5D-A: **NON CREATI, NON TESTATI, NON APPLICATI**. Production: **NON INTERROGATA E NON MODIFICATA**. RLS, grant, ownership e Applications: **NON MODIFICATI**. Web/API: nessun impatto runtime. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Verifiche manuali/visive: **NON APPLICABILI**. Rischi residui: fonti/licenze non ancora approvate, ambiguità delle liste italiane e migration history generale incompleta; `supabase db push` resta vietato.

Sottofasi prudenziali proposte: 5D-B manifest contract/validator; 5D-C controlled vocabulary e compatibility tranche; 5D-D registry fonti/licenze organizations/competitions; 5D-E catalog tranche locale per country/organizer; 5D-F rollout remoto separatamente autorizzato. Prossimo passaggio autorizzabile: **5D-B**, repository-only e senza seed Production.

#### FASE 5D-B — Manifest contract e validator

**Stato: COMPLETATA — IMPLEMENTATA E TESTATA repository-only; NESSUN SEED O MANIFEST DATI REALE.** Deliverable: `docs/european-expansion/phase-5d-b-sports-catalog-manifest-contract.md`.

È disponibile un contratto TypeScript versionato per tutte le 19 entity kind 5C con provenance, Paesi, conteggi, reference simboliche e checksum SHA-256 deterministico. Il validator fallisce su placeholder/licenza non confermata, URL/date/ISO invalidi, key/code/source identity duplicate, dipendenze mancanti o forward, ordine errato, conteggi e checksum drift. Le reference foundation sono allowlisted per code; nessun UUID ambientale, fuzzy mapping o conversione delle categorie italiane è consentito.

Codice modificato: **SÌ — tooling isolato e unit test**. API/UI/runtime: **NON MODIFICATI**. Migration/seed/backfill: **NON CREATI / NON ESEGUITI**. Production: **NON INTERROGATA E NON MODIFICATA**. RLS/grant/ownership/Applications: **NON MODIFICATI**. Web/API e Mobile: **NESSUN IMPATTO / MOBILE FASE 5 NOT STARTED-NON MODIFICATO**. Verifiche manuali: **NON APPLICABILI**; nessuna UI, Preview, Console, Network o Supabase da controllare. Prossimo passaggio autorizzabile: **5D-C**, con revisione umana del contenuto proposto prima di qualunque apply remoto.

#### FASE 5D-C — Controlled vocabulary e compatibility tranche

**Stato: IMPLEMENTATA E TESTATA LOCALMENTE — REVIEW UMANA PENDING; MIGRATION NON APPLICATA REMOTAMENTE.** Deliverable: `docs/european-expansion/phase-5d-c-controlled-vocabulary-compatibility-tranche.md`.

Il manifest controllato contiene 356 record: 3 gender category, 4 format, 6 territorial scope, 97 posizioni Player scoped, 26 ruoli Staff trasversali, 97 applicability Player e 123 mapping legacy esatti. Non contiene organization, competition, level, age class, season, edition, group o categorie italiane reinterpretate. La migration `20261207120000_seed_controlled_sports_vocabulary.sql` è stata applicata due volte su PostgreSQL 16.15 locale con conteggi invarianti; un conflitto sintetico divergente è stato rifiutato con rollback.

Migration creata/testata/applicata: **SÌ / SÌ LOCALE PASS / NO REMOTO**. Production interrogata/modificata: **NO / NO**. RLS/grant/ownership/Applications/backfill: **NON MODIFICATI / NON ESEGUITO**. Web/API/UI: nessun impatto runtime. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Verifica manuale 5D-C: **PASS USER-REPORTED**; non applicare ancora la migration. 5D-D è stata autorizzata e resta separata da qualunque import.

**5D-C-R2 — COMPLETATA / PASS USER-REPORTED.** La review umana è passata solo parzialmente: la card Registro società era ancora italiana e i ruoli Player non calcistici mostravano valori legacy italiani. La remediation localizza la card in IT/EN/ES/FR, dichiara il limite operativo “solo organizzazioni registrate in Italia” e l’estensione internazionale in lavorazione, e completa le label di tutti i ruoli presenti in `SPORTS_ROLES`. Valori persistiti, manifest e migration 5D-C restano invariati. Migration creata/testata/applicata in R1: **NO / NO / NO**. Production: **NON INTERROGATA / NON MODIFICATA**. RLS/grant/ownership/Applications/backfill: **NON MODIFICATI / NON ESEGUITO**. Web: **presentation-only**; API: **NESSUN IMPATTO**; Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Deliverable: `docs/european-expansion/phase-5d-c-r1-human-review-remediation.md`. Il recheck Preview di Club/Profile, Player/Profile, widget laterale, Console e Network è stato confermato PASS dall’utente; 5D-D è stata successivamente autorizzata. Il recheck R2 localizza inoltre lo sport nel widget “Profili che segui”. È confermato che categorie, federazioni e competizioni sono nomi propri nazionali: quelle italiane restano in italiano in ogni lingua UI e i futuri cataloghi esteri manterranno la rispettiva denominazione nazionale.

#### FASE 5D-D — Source registry organizations/competitions

**Stato: COMPLETATA — PASS USER-REPORTED; NESSUN IMPORT.** Deliverable: `docs/european-expansion/phase-5d-d-sports-organization-competition-source-registry.md`; registry: `data/sports/phase-5d-d-source-registry.json`. La discovery football copre authority candidate ufficiali per IT/FR/ES/CH/SI/PL e UEFA, ma nessuna fonte è approvata: licenza/riuso, endpoint dataset, stable ID, coverage/versione e checksum non sono dimostrati. Migration/seed/import/backfill: **NO**. Production: **NON INTERROGATA / NON MODIFICATA**. RLS/grant/ownership/Applications: **NON MODIFICATI**. Web/API: **NESSUN IMPATTO**. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Verifica manuale: review dei sette URL e della policy nomi propri nazionali; UI/Console/Network/Supabase non applicabili. 5D-E non è iniziata e richiede evidence pack più nuova autorizzazione.

#### FASE 5D-E-A — Source evidence readiness gate

**Stato: COMPLETATA — PASS USER-REPORTED; 0/7 FONTI READY; NESSUN MANIFEST, MIGRATION O IMPORT.** Il gate puro `lib/taxonomy/sportsSourceReadiness.ts` richiede authority, dataset URL, stable ID, version/effective date, termini di riuso, licenza, attribution, coverage e checksum. Tutte le fonti 5D-D restano bloccate prima del manifest. Le ricerche read-only su portali open data IT/FR/CH non hanno prodotto un dataset federale pertinente approvabile. Production: **NON INTERROGATA / NON MODIFICATA**. RLS/grant/ownership/Applications: **NON MODIFICATI**. Web/API: **NESSUN IMPATTO**. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Verifica manuale UI/Console/Network/Supabase: **NON APPLICABILE**; è richiesta conferma del gate e scelta di una authority per un evidence pack separato. Deliverable: `docs/european-expansion/phase-5d-e-a-source-readiness-gate.md`. 5D-E-B e qualunque import non sono avviati.

#### FASE 5D-E-B — Evidence pack FIGC/IT

**Stato: AUDIT IMPLEMENTATO E TESTATO — FIGC SOURCE BLOCKED; NESSUN MANIFEST O IMPORT.** Homepage, pagina Campionati Nazionali, sitemap e condizioni di utilizzo FIGC sono state verificate via GET pubbliche read-only e registrate con checksum nel pack `data/sports/evidence/phase-5d-e-b-figc-it-evidence-pack.json`. La pagina competizioni e la sitemap non sono dataset; non risultano dataset/API catalogo, stable record ID, versione, coverage o una concessione esplicita al riuso del database. Il gate restituisce `BLOCKED_NOT_READY_FOR_LOCAL_MANIFEST`. Migration/seed/import/backfill: **NO**. Production: **NON INTERROGATA / NON MODIFICATA**. RLS/grant/ownership/Applications: **NON MODIFICATI**. Web/API: **NESSUN IMPATTO**. Mobile FASE 5: **NOT STARTED / NON MODIFICATO**. Review manuale documentale PENDING; 5D-E-C e qualunque import non sono avviati. Deliverable: `docs/european-expansion/phase-5d-e-b-figc-it-evidence-pack.md`.

#### FASE 5D-E-R-FR — Ricerca documentale Francia per i selettori

**Stato: COMPLETATA CON COPERTURA PARZIALE DICHIARATA — REVIEW UMANA PENDING; NESSUN MANIFEST O IMPORT.** Dopo il riallineamento con FASE 1/5A/5B e con le categorie legacy, è stata autorizzata una ricerca documentale country-by-country distinta dal source-readiness automatico. La tranche Francia copre tutti i 14 valori Sport realmente esposti dall'app, censendo federation/organizer, denominazioni ufficiali, genere, senior/giovani, scope e livello soltanto quando sostenuto da pagine, portali, regolamenti o comunicati ufficiali. Non censisce squadre, risultati, calendari o ogni singolo girone territoriale; dichiara esplicitamente le lacune, soprattutto per Pallanuoto, Hockey su prato, Lacrosse e Football americano. L'assenza di dataset/licenza/stable ID blocca soltanto manifest/seed/import automatici e non invalida la conoscenza documentale o le categorie legacy. Applicazione/API/UI, migration/seed/backfill, Production, RLS/grant/ownership/Applications e Mobile: **NON MODIFICATI**. Deliverable: `docs/european-expansion/phase-5d-e-r-france-competition-selector-research.md`. **Stop gate:** review Francia prima di iniziare la Spagna.

**Review Francia: PASS USER-REPORTED sul metodo e livello iniziale; non certifica ogni denominazione e non autorizza population dei selector.** Le lacune restano registrate per una successiva integrazione senza riaprire ora l'intera ricerca Francia.

#### FASE 5D-E-R-ES — Ricerca documentale Spagna per i selettori

**Stato: PRIMA RICOGNIZIONE COMPLETATA CON COPERTURA PARZIALE DICHIARATA — REVIEW UMANA PENDING; NESSUN MANIFEST O IMPORT.** Coperti i 14 Sport UI con priorità ai senior maschili/femminili dilettantistici, organismi nazionali/territoriali/circuiti esterni verificabili e principali giovani nazionali; coppe escluse dal primo elenco selector. Le fonti non accessibili o le denominazioni stagionali deboli sono marcate da ricontrollare, senza dichiararle inesistenti. Fútbol 8 non eredita il fútbol 11 e le label omonime restano scoped a sport/organizer. Applicazione/API/UI, migration/seed/import/backfill, Production, RLS/grant/ownership/Applications e Mobile: **NON MODIFICATI**. Deliverable: `docs/european-expansion/phase-5d-e-r-spain-competition-selector-research.md`. **Stop gate:** review Spagna prima della Svizzera.

Suddivisione confermata dopo l'audit:

- 5A — audit Sports / Disciplines / Competitions — **COMPLETATA**;
- 5B — contratto canonico e regole di compatibilità — **COMPLETATA**;
- 5C — schema additivo e migration — **COMPLETATA / APPLICATA IN PRODUCTION / DATABASE E SMOKE WEB PASS**;
- 5D — cataloghi e seed controllati — **IN CORSO: 5D-A–5D-E-A COMPLETATE; FIGC SOURCE BLOCKED; FRANCIA PASS METODOLOGICO; SPAGNA COMPLETATA/REVIEW PENDING; CH/SI/PL NON INIZIATI**;
- 5E — dual-read / dual-write e adapter server — **NOT STARTED**;
- 5F — profili ed esperienze — **NOT STARTED**;
- 5G — Opportunities e Applications — **NOT STARTED**;
- 5H — Search / Discover / WhoToFollow — **NOT STARTED**;
- 5I — UI, filtri e controlled vocabulary — **NOT STARTED**;
- 5J — regressione, backward compatibility e certificazione — **NOT STARTED**.

La foundation verificata copre sport, discipline e variant; la matrice europea completa non è dichiarata completata. Il modello europeo concordato deve comprendere:

- sport;
- discipline/variant;
- sports organization;
- competition;
- competition level;
- competition group;
- age class;
- gender;
- season;
- competition format;
- territorial scope.

Le strutture devono essere country-aware e prevedere federazioni, enti, piramidi, livelli, gruppi territoriali, giovanili, M/F/mixed, stagioni, denominazioni e dipendenze federali.

## FASE 6 — European Profile Model Completion

**Stato: NOT STARTED.**

Obiettivo futuro: completare i modelli Club, Player, Staff, Fan e Institution con campi country-aware, sport, discipline, competizioni, organizzazioni, categorie, geografia, lingue e relocation/interests. Prima di qualsiasi modifica deve essere eseguito un audit per account type.

## FASE 7 — International Opportunities & Scouting

**Stato: NOT STARTED.**

Obiettivo generale: rendere Opportunities e scouting realmente internazionali e country-aware, mantenendo compatibilità con il modello italiano esistente, dati legacy, ownership, applications, RLS e account type esistenti. La fase deve iniziare soltanto quando le dipendenze necessarie delle Fasi 3, 5 e 6 sono sufficientemente stabili.

La FASE 3C-C prepara l'integrazione geografica canonica delle Opportunities; la FASE 7 completa invece lo scouting internazionale cross-country tramite relocation, interessi geografici, matching, filtri internazionali e contesto sportivo/competitivo europeo. Non duplicare il lavoro già completato in 3C-C.

### 7A — International Opportunities audit

**Stato: NOT STARTED.** Prima di modificare il comportamento, verificare lo stato reale di opportunities, applications, `OpportunityForm`, create/edit flow, dettaglio Opportunity pubblico, integrazione Search/Discover, API/server actions, query Supabase, RLS, ownership, geografia, sport, discipline, category, gender, age, role/position, filtri e dipendenze mobile.

Preservare le invarianti già verificate: `club_id` coerente con il profilo Club, `owner_id`, `created_by`, applicant ownership, application ownership e RLS. Non modificarne incidentalmente le semantiche.

### 7B — Cross-country Opportunities

**Stato: NOT STARTED.** Supportare esplicitamente opportunità tra Paesi differenti. Scenari rappresentativi:

- Player IT → Club FR;
- Player ES → Club IT;
- Staff IT → Club CH;
- Player PL → Club ES;
- Player FR → Club CH.

Nazionalità o residenza dell'utente non devono impedire automaticamente visualizzazione o candidatura a un'Opportunity estera.

### 7C — International Opportunity context

**Stato: NOT STARTED.** Integrare, quando disponibili e validati, riferimenti canonici a country, geo area, sport, discipline, variant, sports organization, competition, competition level, competition group, age class, gender, season e territorial scope. Evitare stringhe duplicate quando esiste un riferimento canonico stabile e mantenere il fallback legacy finché necessario.

### 7D — Relocation

**Stato: NOT STARTED.** Integrare `profile_preferences.open_to_relocation` esclusivamente come segnale di disponibilità al trasferimento. Non interpretarlo come cambio o Paese di residenza, né come interesse verso qualsiasi Paese.

### 7E — Country interests

**Stato: NOT STARTED.** Integrare `profile_country_interests` nel matching/scouting. Un Paese di interesse indica interesse verso opportunità relative a quel Paese; non equivale a residence, nationality o birth country.

### 7F — Geographic-area interests

**Stato: NOT STARTED.** Integrare `profile_geo_area_interests` come segnale territoriale opzionale. Un Player residente in Italia può, per esempio, essere interessato a Francia, Île-de-France, Madrid o Canton Ticino senza modificare la propria residenza canonica.

### 7G — International matching

**Stato: NOT STARTED.** Definire progressivamente un matching che possa utilizzare account type, sport, discipline, role/position, competition, level, country, geographic interests, relocation, age/category, gender ed experience, senza rendere un singolo segnale l'unico criterio. Prima di ranking complessi sono obbligatori audit, metriche, test ed explainability minima.

### 7H — International Opportunity filters

**Stato: NOT STARTED.** Supportare almeno filtri per country, geographic area, sport, discipline, competition, level, gender, age/category, role/position e relocation compatibility. I filtri geografici devono usare il modello canonico country-aware.

### 7I — Applications cross-country

**Stato: NOT STARTED.** Verificare candidatura a Club esteri, notifiche, permissions, privacy, ownership, status, eventuali email ed eventuali implicazioni linguistiche. Non creare regole che impediscano candidature internazionali senza una decisione di prodotto esplicita.

### 7J — Regression

**Stato: NOT STARTED.** Testare almeno Opportunity legacy IT, nuova Opportunity IT, Opportunity FR/ES/CH/SI/PL, Player e Staff cross-country, applications, ownership, RLS, filtri, relocation, country interests e geo interests. Solo dopo questi controlli la FASE 7 può essere marcata **COMPLETATA**.

## FASE 8 — International Search / Feed / Recommendations

**Stato: NOT STARTED.**

Obiettivo generale: rendere Search, Discover, WhoToFollow, feed e sistemi di raccomandazione realmente internazionali. La FASE 3C-D prepara la fondazione geografica di Search, Discover e WhoToFollow; la FASE 8 completa ranking, recommendations, feed, scouting, interessi e cross-country discovery. Non duplicare il lavoro già completato nella FASE 3.

### 8A — International discovery audit

**Stato: NOT STARTED.** Prima di modificare, auditare Search, Discover, WhoToFollow, feed, recommendations, ricerche di profili/Club/Player/Staff/Institution, Opportunity discovery, filtri, ranking, pagination, query Supabase, RPC, view, indici e caching.

### 8B — Country-aware discovery

**Stato: NOT STARTED.** Permettere esplicitamente di esplorare Paesi diversi dal proprio. Un utente italiano deve poter cercare Club FR, Player ES, Staff CH, Institution PL e Opportunities SI senza modificare la propria residenza. `residence_country` non deve diventare un filtro obbligatorio nascosto.

### 8C — Geographic discovery

**Stato: NOT STARTED.** Permettere filtri tramite country, canonical geo area, descendants, ancestors e territorial scope. UI e query devono rispettare gerarchie differenti: non hardcodare `REGION → PROVINCE → MUNICIPALITY` come struttura universale.

### 8D — Profile country interests

**Stato: NOT STARTED.** Usare `profile_country_interests` come segnale per migliorare discovery e raccomandazioni, mai come residenza.

### 8E — Profile geo-area interests

**Stato: NOT STARTED.** Usare `profile_geo_area_interests` come segnale territoriale, mai come residenza.

### 8F — Relocation signal

**Stato: NOT STARTED.** Integrare `open_to_relocation` quando semanticamente utile allo scouting, senza alterare automaticamente residence, public geography o country interests.

### 8G — WhoToFollow international

**Stato: NOT STARTED.** Rendere WhoToFollow internazionale mantenendo segnali quali sport, account type, following, relevance, geography, country interests e social graph. Il Paese non deve diventare l'unico criterio di ranking.

### 8H — International feed

**Stato: NOT STARTED.** Valutare progressivamente following, sport, discipline, account type, country, interests, geography, relevance e recency, evitando che l'espansione europea renda il feed casuale o eccessivamente dispersivo.

### 8I — Recommendations

**Stato: NOT STARTED.** Definire recommendations country-aware senza assunzioni su nazionalità o residenza. Distinguere sempre residence, nationality, birth country, country interests, geo-area interests e relocation.

### 8J — Performance

**Stato: NOT STARTED.** Verificare query plan, indici, pagination, filtering, ranking, payload, N+1, cache e search latency, tenendo conto della crescita di utenti, Opportunities e `geo_areas`.

### 8K — Regression

**Stato: NOT STARTED.** Testare utenti legacy italiani, utenti senza `profile_preferences`, utenti canonici, utenti esteri, multi-country interests, Search, Discover, WhoToFollow, feed, Opportunities e ranking. Solo dopo questi controlli la FASE 8 può essere marcata **COMPLETATA**.

## FASE 9 — Mobile Parity

**Stato: NOT STARTED.**

**Principio architetturale.** Il repository web costituisce la baseline funzionale per l'espansione europea. Mobile deve ricevere successivamente una parity controllata rispetto al comportamento web validato. Non sviluppare contemporaneamente implementazioni web/mobile divergenti senza decisione esplicita e non copiare meccanicamente codice Next.js/React in React Native: replicare comportamento, contratti dati, regole e una UX appropriata al mobile.

### 9A — Mobile international audit

**Stato: NOT STARTED.** Prima di modificare il repository mobile, auditare Expo, Expo Router, Supabase, authentication, Signup, onboarding, Profile Edit, form per account type, Opportunities, Search, Discover, WhoToFollow, Maps, language, contratti API, comportamento native-specific, Android e iOS.

### 9B — Canonical geography parity

**Stato: NOT STARTED.** Portare su mobile countries, gerarchia geografica canonica, residence country, residence geo area, country interests, geo-area interests, relocation, canonical-first read e legacy fallback. Supportare IT, FR, ES, CH, SI e PL senza assumere una gerarchia italiana universale.

### 9C — Profile parity

**Stato: NOT STARTED.** Replicare i flussi web validati per Club, Player/Athlete, Staff, Fan e Institution. Mantenere separati residence, nationality, birth country, interests e relocation.

### 9D — Opportunities parity

**Stato: NOT STARTED.** Replicare creation, edit, detail, discovery, filtri, applications e international scouting.

### 9E — Search / Discover / WhoToFollow parity

**Stato: NOT STARTED.** Portare country filtering, geo filtering, cross-country discovery, interests, relocation signals e ranking validato sul web.

### 9F — Maps parity

**Stato: NOT STARTED.** Adattare il comportamento delle mappe alla piattaforma mobile senza assumere un'implementazione tecnica identica al web. Preservare canonical geography, coordinate, filtri, clustering/performance e legacy fallback dove necessario.

### 9G — i18n parity

**Stato: NOT STARTED.** Portare almeno Italiano, English, Français ed Español, con preferred language, fallback, persistence, validation, errors e native navigation labels.

### 9H — Sports / competitions parity

**Stato: NOT STARTED.** Portare il modello sportivo europeo soltanto dopo la validazione web.

### 9I — Android regression

**Stato: NOT STARTED.** Verificare specificamente scrolling, freeze, keyboard, navigation, liste, immagini, interazioni audio/chat, mappe, permissions, deep link e performance.

### 9J — iOS regression

**Stato: NOT STARTED.** Verificare specificamente navigation, keyboard, safe area, liste, mappe, permissions, deep link, performance e comportamento App Store.

### 9K — Web/mobile parity certification

**Stato: NOT STARTED.** Creare una matrice funzionale. Una feature non può essere marcata parity soltanto perché TypeScript compila o la build passa: deve essere verificato il comportamento reale. Solo dopo la certificazione la FASE 9 può essere marcata **COMPLETATA**.

## FASE 10 — QA / Security / Performance / European Rollout

**Stato: NOT STARTED.**

Questa è l'ultima fase principale della roadmap europea iniziale e il gate finale prima del suo completamento. La roadmap principale termina con la FASE 10: non devono essere create FASI 11, 12, 13 o successive. Le attività ulteriori appartengono esclusivamente alla sezione **Post-roadmap — Future Expansion** e non costituiscono nuove fasi principali.

La FASE 10 comprende quattro macro-aree: QA; Security/RLS/Privacy; Performance/Scale; Rollout/Monitoring.

### 10A — QA matrix

**Stato: NOT STARTED.** Creare una matrice QA sistematica e verificabile sui Paesi IT, FR, ES, CH, SI e PL; sulle lingue IT, EN, FR ed ES; e sugli account type Club, Player/Athlete, Staff, Fan e Institution. Testare combinazioni rappresentative di Paese, lingua, account type, geografia, sport, Opportunities, Search e Maps.

Copertura minima: Signup, onboarding, login, Profile Edit, profile preferences, residence country, residence canonical geography, country interests, geo-area interests, relocation, sport, discipline, competitions, Search, Discover, WhoToFollow, feed, Opportunities, applications, Maps, notifications, email, language preference, fallback language, permissions e RLS. La regression Italia è obbligatoria.

### 10B — Canonical geography certification

**Stato: NOT STARTED.** Ricontrollare integralmente countries, `geo_areas`, parent hierarchy, country consistency, `area_type`, provider, provenance, source metadata, legacy mapping, canonical-first read, legacy fallback e gerarchia country-aware.

Baseline geografica Production attualmente certificata:

| Country | Areas | Expected hierarchy |
| --- | ---: | --- |
| IT | 7,724 | `REGION → PROVINCE → MUNICIPALITY` |
| FR | 34,994 | `REGION → DEPARTMENT → COMMUNE` |
| ES | 8,203 | `AUTONOMOUS_COMMUNITY → PROVINCE → MUNICIPALITY` |
| CH | 2,284 | `CANTON → DISTRICT` opzionale `→ MUNICIPALITY` |
| SI | 224 | `STATISTICAL_REGION → MUNICIPALITY` |
| PL | 2,875 | `VOIVODESHIP → POWIAT → GMINA` |
| **TOTAL** | **56,304** |  |

Se un dataset viene aggiornato prima del rollout, rieseguire preprocessing, dry-run, import validation, idempotency check e conteggi Production, quindi aggiornare questa roadmap.

### 10C — Profile geography certification

**Stato: NOT STARTED.** Verificare `profile_preferences.residence_country_id`, `profile_preferences.residence_geo_area_id`, coerenza country/geo, canonical-first, Italy legacy fallback, legacy textual fallback, `profile_country_interests`, `profile_geo_area_interests` e `open_to_relocation`.

Riconfermare il divieto di backfill automatico di `interest_region`, `interest_province`, `interest_city`, `interest_region_id`, `interest_province_id` e `interest_municipality_id` verso `residence_geo_area_id`: gli `interest_*` non provano la residenza. Residence, country interests, geo-area interests, relocation, birth country e nationality devono restare distinti.

### 10D — Security / RLS review

**Stato: NOT STARTED.** Auditare `profile_preferences`, `profile_country_interests`, `profile_geo_area_interests`, `geo_areas`, Opportunities, applications, endpoint Search e Maps, server actions, RPC, API e query dei profili pubblici. Verificare owner/admin semantics, service role, accesso authenticated/anonymous e operazioni select/insert/update/delete. Una policy corretta per un account type non è automaticamente corretta per tutti.

### 10E — Geographic privacy

**Stato: NOT STARTED.** La presenza di `residence_geo_area_id` nel database non deve rendere automaticamente pubblica la residenza. Distinguere dato interno, pubblico, di matching, di scouting, di interesse e personale. Valutare separatamente Club, Player/Athlete, Staff, Fan e Institution: la geografia pubblica di Club e Institution può avere semantica diversa dalla residenza personale.

### 10F — Personal information & privacy regression

**Stato: NOT STARTED.** Verificare che l'espansione non riduca le protezioni di email, phone, messaggi privati, profile visibility, feed pubblico, commenti, Search, dettagli profilo e dati geografici. Le protezioni di telefono/email nei contenuti pubblici devono continuare a funzionare.

### 10G — Authorization & ownership regression

**Stato: NOT STARTED.** Verificare che le ownership semantics di Profiles, Opportunities e Applications non siano state alterate. Per Opportunities controllare `club_id`, `owner_id` e `created_by`; per Applications applicant identity, club identity, ownership e permissions.

### 10H — Performance / scale review

**Stato: NOT STARTED.** Auditare `geo_areas`, query parent/children, ancestors, descendants, filtri country, profile geography, Search, Discover, WhoToFollow, Opportunities, applications, Maps, recommendations e feed. Verificare indici, query plan, pagination, N+1, payload size, caching, filtering, join, network request e client rendering. `geo_areas` contiene già 56,304 record; nuovi Paesi devono essere supportabili senza redesign strutturale.

### 10I — Database / migration audit

**Stato: NOT STARTED.** Verificare migration history e ordering, migration nel repository, schema Production, FK, UNIQUE, indici, RLS, trigger, funzioni e compatibility. Accertare l'assenza di migration critiche non applicate, migration applicate ma assenti dal repository e dipendenze accidentali da staging o raw dataset locali. Non documentare service key, secret, token o password.

### 10J — Provenance / licensing final check

**Stato: NOT STARTED.** Riconfermare provider, dataset version, source identifier, source license, attribution requirements e publication/update metadata per IT, FR, ES, CH, SI e PL. Non lasciare placeholder come `CONFIRM_REQUIRED` nelle configurazioni per il rollout Production finale.

### 10K — Web certification

**Stato: NOT STARTED.** Certificare il web su IT, FR, ES, CH, SI e PL con account Club, Player/Athlete, Staff, Fan e Institution. Verificare almeno signup, onboarding, Profile Edit, geography, interests, relocation, sports, Opportunities, Search, Discover, WhoToFollow, Maps, language e permissions.

### 10L — Mobile certification

**Stato: NOT STARTED.** Certificare separatamente Android e iOS e verificare il completamento reale della Mobile Parity della FASE 9. Build, typecheck e lint non bastano: serve verifica funzionale. Per Android controllare scrolling, freeze, navigation, keyboard, liste, mappe e performance; per iOS navigation, keyboard, safe area, mappe, permissions e performance.

### 10M — Italy regression gate

**Stato: NOT STARTED — GATE BLOCCANTE.** L'espansione europea non può essere rilasciata se rompe i flussi italiani. Verificare registrazione, onboarding, Profile Edit, `regions`/`provinces`/`municipalities` legacy, legacy geo mapping, Club, Player, Staff, Fan, Institution, Opportunities, Search, Maps e mobile. I profili legacy italiani devono funzionare anche senza dati canonici espliciti.

### 10N — Cross-country QA

**Stato: NOT STARTED.** Testare scenari quali Player IT → Opportunity FR, Player ES → Opportunity IT, Staff IT → Club CH, Player PL → Club ES, Club FR → ricerca Player IT e Club CH → ricerca Staff FR. Verificare visibility, filtri, matching, applications, notifications, language, permissions, interests e relocation.

### 10O — Language QA

**Stato: NOT STARTED.** Verificare Italiano, English, Français ed Español per label, navigation, form, validation, errori, email, notification, Opportunities, Search, geography, sport e metadata, incluso il fallback quando manca una traduzione.

### 10P — Pre-production certification

**Stato: NOT STARTED.** Prima del rollout, un checkpoint formale deve confermare: schema, migration, canonical geography, profiles, Opportunities, Search, Maps, i18n, security/RLS, performance, web, Android, iOS e Italy regression **OK**. Se un gate critico fallisce, non procedere al rollout.

### 10Q — Staged rollout

**Stato: NOT STARTED.** Il rollout deve essere graduale, valutando feature flag, country activation, progressive exposure, rollout web-first, rollout mobile successivo o coordinato e rollback strategy. I Paesi iniziali oltre IT sono FR, ES, CH, SI e PL; l'ordine effettivo dipenderà dallo stato reale del prodotto.

### 10R — Monitoring

**Stato: NOT STARTED.** Monitorare Sentry/errori, fallimenti Signup/onboarding/Profile Edit, errori geografici e combinazioni country/area non valide, errori Opportunities/applications, latenza ed errori Search, performance Maps, failure API, crash/freeze mobile e RLS denial inattesi. Segmentare per IT, FR, ES, CH, SI e PL quando possibile.

### 10S — Post-launch verification

**Stato: NOT STARTED.** Dopo il rollout verificare dati reali: nuovi profili, residence canonical, country/geo-area interests, relocation, Opportunities, cross-country applications, Search, Discover, WhoToFollow, feed, Maps, lingue e parity mobile/web, cercando anomalie per Paese.

### 10T — Final regression

**Stato: NOT STARTED.** Dopo il periodo iniziale di rollout rieseguire QA critica, security, RLS, performance, conteggi canonical geography, profile consistency, Opportunities, Search, Maps e mobile.

### 10U — Phase 10 completion criteria

La FASE 10 può essere marcata **COMPLETATA** soltanto con QA matrix, Security/RLS review, privacy review, performance review e migration audit completati; provenance/licensing verificati; web, Android e iOS certificati; Italy regression e cross-country QA superate; rollout completato; monitoring attivo; post-launch verification completata; nessun blocker critico aperto.

## Definition of Done — European Expansion

L'espansione europea iniziale è **COMPLETATA** soltanto quando tutte le FASI da 1 a 10 sono completate. Non bastano dati geografici, database multi-Paese, alcuni form o traduzioni, né compilazione web/mobile.

Devono essere operativi e verificati:

1. canonical countries;
2. canonical geography;
3. profile geography;
4. interests;
5. relocation;
6. international UI;
7. i18n;
8. sports/discipline/competition model;
9. European profile model;
10. Opportunities;
11. international scouting;
12. Search;
13. Discover;
14. WhoToFollow;
15. feed/recommendations;
16. Maps;
17. web;
18. Android;
19. iOS;
20. security/RLS;
21. privacy;
22. performance;
23. Italy regression;
24. cross-country flows;
25. staged rollout;
26. monitoring.

Solo allora aggiornare il Current checkpoint a **EUROPEAN EXPANSION INITIAL ROADMAP COMPLETED**.

## Post-roadmap — Future Expansion

Questa sezione non è una FASE 11: la roadmap principale termina con la FASE 10. Dopo la stabilizzazione di IT, FR, ES, CH, SI e PL potranno essere valutati PT — Portugal, DE — Germany e AT — Austria, con Português e Deutsch fra le lingue aggiuntive previste.

Ogni nuovo Paese deve seguire lo stesso processo disciplinato:

1. ricerca di fonti ufficiali;
2. verifica licensing/provenance;
3. modello geography;
4. dataset ufficiali;
5. preprocessing;
6. dry-run;
7. import verification;
8. ricerca sport/competition;
9. profile compatibility;
10. Opportunities compatibility;
11. Search/Maps compatibility;
12. impatto linguistico;
13. web QA;
14. mobile parity;
15. security/RLS;
16. performance;
17. staged rollout.

Non introdurre eccezioni hardcoded per un singolo Paese quando il problema può essere risolto nel modello canonico.

## Current next action

Alla data di creazione iniziale della roadmap:

| Voce | Stato |
| --- | --- |
| Last completed subphase | **FASE 3C-E7 — COMPLETATA / PASS** |
| Current active phase | **FASE 3C-E — MAPS WEB COMPLETATA / PASS** |
| Next safe action | **Nessuna; Mobile parity rinviata alla repository Mobile** |
| B4.3 local runtime harness | **PASSED — PostgreSQL 16, fixture sintetiche, nessuna connessione remota** |
| B4.3 Supabase certification | **BLOCKED — PREVIEW BRANCH UNHEALTHY / MIGRATIONS FAILED / SUPPORT PENDING** |
| B4.4 | **COMPLETATA — CANARY APPLICATIVO PLAYER IT / STAFF FR, READ-AFTER-WRITE, CLEANUP E RIPRISTINO FAIL-CLOSED PASS** |
| FASE 3C-B | **COMPLETATA — B1–B7 repository web/API** |
| FASE 3C-C | **COMPLETATA — C1–C7 PASS** |
| FASE 3C-D | **COMPLETATA — D1–D7 PASS** |
| Automatic residence backfill | **DELIBERATELY EXCLUDED** |
| Mobile international parity | **NOT STARTED** |

B7 è chiusa nel perimetro repository web/API. Non riabilitare grant o gate e non interpretare la chiusura come rollout. Prima del merge eseguire gli smoke manuali Preview documentati, inclusi accesso Settings Institution desktop/mobile e assenza mobility per Club/Institution/Fan.

C1 Opportunities è chiusa come audit repository-only: nessuna migration, query remota, write, UI o modifica mobile. La verifica manuale C1 non è applicabile. Attendere autorizzazione esplicita prima di C2.

C2 Opportunities è chiusa come contratto schema repository-only: DDL blueprint additivo definito, ma nessuna migration o modifica runtime è stata creata o applicata. Production non è stata interrogata o modificata; web e mobile non hanno modifiche comportamentali. La verifica manuale/visiva C2 non è applicabile. Attendere autorizzazione esplicita prima di C3.

C3 Opportunities è chiusa: migration additiva creata e testata due volte su PostgreSQL 16.15 locale con fixture sintetiche, rollback e cleanup PASS. La migration non è stata applicata a Preview o Production; nessuna query remota, UI, API, RLS, grant, backfill o modifica mobile. La verifica manuale/visiva C3 non è applicabile. Attendere autorizzazione esplicita prima di C4.

Aggiornamento successivo: l'utente ha applicato la migration C3 con esito `Success. No rows returned`; target e Production non sono stati verificati indipendentemente.

C4 Opportunities è chiusa nel repository web/API: dual-read canonical-first e dual-write atomico/field-aware implementati, senza selector form, filtri canonici, migration aggiuntive, RLS/grant/backfill o mobile. La verifica manuale/visiva C4 non è applicabile. Attendere autorizzazione esplicita prima di C5.

C5 Opportunities è **COMPLETATA**: test automatici e smoke Preview user-reported PASS.

C6 Opportunities è **COMPLETATA**: test automatici e smoke Preview user-reported PASS. Il filtro trova correttamente le nuove righe canoniche; lo smoke ha evidenziato che le righe storiche prive di ID non soddisfano filtri canonici.

C7 Opportunities è **COMPLETATA / PASS**: audit Production 31/0/0/0/0, apply fail-closed exit 0 su 31 Municipality, post-audit tutto zero e smoke web completo user-reported PASS. Allowlist privata conservata; nessun altro write, merge o fase successiva autorizzato.

D1 Search / Discover / WhoToFollow è **COMPLETATA / PASS** come audit repository-only. Sono stati separati Search globale, Discover, i due endpoint suggerimenti e Maps; documentati canonical residence, country/geo-area interests, relocation, fallback legacy, privacy/RLS, ranking e performance. Nessuna query remota, migration, modifica runtime/UI/mobile o creazione/uso di file binari. D2 è il prossimo passo e non è ancora iniziata.

D2 Search canonical filtering/ranking contract è **COMPLETATA / PASS**: modulo TypeScript puro con parser canonical/legacy, alias compatibility, validazione catalog adapter, descendants same-country, reason weights e ordinamento deterministico. Nessun collegamento runtime/UI/DB e nessun file binario; verifica manuale/visiva non applicabile. D3 non è ancora iniziata.

D3 Search canonical filters è **COMPLETATA / PASS**: legacy, canonical country, canonical area, Opportunity count, invalid UUID HTTP 400, area senza country HTTP 400, no-filter e Network/console sono user-reported PASS. Il primo canonical area/Opportunity smoke aveva restituito `UNKNOWN`; individuato il fan-out di descendant UUID, sostituito con proiezione gerarchica bounded e recheck HTTP 200 PASS con `Opportunité Ain` unico risultato e conteggio 1. Nessuna migration, write, UI, Maps, mobile o file binario.

D4 Discover / WhoToFollow data boundary è **COMPLETATA / PASS**: endpoint principale e alternativo, quattro geoScope, esclusioni, debug, `/discover` e assenza di errori sono user-reported PASS dopo il fix dei conteggi diagnostici. Nessuna migration, write, modifica RLS, Maps, mobile o file binario.

D5 international ranking e relocation è **COMPLETATA / PASS**: entrambi gli endpoint hanno restituito HTTP 200, `rankingVersion=d5-v1` e gli stessi ID nello stesso ordine in esecuzioni consecutive; self/already-followed esclusi e superfici `/discover`/feed user-reported PASS. Il viewer era legacy (`hasCanonicalGeographyInterests=false`, `openToRelocation=false`); canonical-interest e relocation sono coperti automaticamente e restano nella matrice D7.

D6 UI e scouting internazionale è **COMPLETATA / PASS**: selector country/area, URL/reload/reset, filtri strict, account type, sport, card, Follow, Network/Console e comportamento visivo sono user-reported PASS.

D7 regressione e backward compatibility è **COMPLETATA / PASS**: matrice automatica per sei Paesi e legacy, account type, privacy, visibility pubblica, esclusioni, stabilità, localizzazione e limiti query; smoke Preview ripetuto HTTP 200 con ordine stabile per entrambi gli endpoint, `rankingVersion=d5-v1` e nessun `UNKNOWN`. Lo smoke UI D6 resta PASS. Nessuna migration, write, modifica RLS, Maps, mobile o file binario. FASE 3C-D è chiusa; la prossima fase autorizzabile è 3C-E1 Maps repository-only audit.

E1 Maps audit è **COMPLETATA / PASS repository-only**: inventariati ClubMap, SearchMap disattivata tramite redirect, tre endpoint, picker sede/stadio, fonti generic/stadium e centroid/bounds canonici. Rilevati come gate E2 privacy delle coordinate personali, precedenza coordinate unica, query spatially strict, validazione bounds, semantica Opportunity, pagination/clustering, provider e sanitizzazione popup. Nessuna modifica runtime, query remota, migration, RLS, mobile o file binario. E2 richiede autorizzazione separata.

E2 coordinate, viewport e privacy contract è **COMPLETATA / PASS**: modulo puro con coppie atomiche e range, pin pubblici organization-only, precedenza venue → legacy, viewport canonical/bounds fail-closed, supporto antimeridiano e semantica Opportunity senza centroid-pin. Nove test automatici PASS. Nessun endpoint, query, migration, RLS, UI/provider Maps, mobile o file binario. E3 richiede autorizzazione separata.

E3 Maps server data boundary è **COMPLETATA / PASS**: adapter catalogo/viewport read-only, query venue-first stadium-aware, bounds strict/antimeridiano, privacy organization-only, niente fallback globale e Opportunity owner pool limitato. Gli smoke endpoint e redirect sono user-reported PASS. Nessuna migration, RLS, write remoto, provider/UI client, mobile o file binario.

E4 ClubMap internazionale è **COMPLETATA / PASS**: viewport europeo, selector canonicale URL-stable, filtro server canonical-to-legacy per gerarchie prive di bounds, clustering, popup, reload/reset e assenza di refetch allo zoom sono user-reported PASS. Nessuna migration, RLS, write remoto, nuovo provider, Opportunity map, mobile o file binario.

E5 SearchMap decision e integrazione è **COMPLETATA / PASS**: `/club-map` è l'unica UI Maps pubblica; bookmark `/search-map` reindirizza a ClubMap, CTA runtime sono riconciliate e il client storico irraggiungibile è rimosso. Endpoint server conservati senza pin personali.

E6 Opportunity map semantics è **COMPLETATA / PASS**: placement esplicito e versionato, owner public point come unico fallback, geography canonicale solo metadata/viewport e compatibilità ID profilo/Auth. Il recheck ha confermato zero Opportunity open visibili e 38 Club bounded, quindi empty corretto.

E7 Maps regressione/performance/provider/backward compatibility è **COMPLETATA / PASS**: policy provider e cap centralizzata, truncation metadata, matrice privacy/canonical/redirect/placement e smoke finale user-reported PASS. **FASE 3C-E Maps è chiusa lato Web.** Mobile parity resta NOT STARTED ed è rinviata alla repository Mobile.
