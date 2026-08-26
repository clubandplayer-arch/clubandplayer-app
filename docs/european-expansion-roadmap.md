# European Expansion Master Roadmap

Questo file è il documento master, ufficiale e persistente per l'espansione internazionale ed europea di Club and Player. Deve essere letto **prima** di iniziare qualsiasi nuova fase relativa a Paesi, lingue, geografia, profili, sport, competizioni, Opportunities, Search, Discover, WhoToFollow, Maps, i18n, mobile parity o rollout europeo.

Ogni task futuro deve aggiornare questo documento al termine della fase assegnata. Questo documento non è e non deve diventare un changelog generico dell'intero prodotto Club and Player.

## Current checkpoint

| Voce | Stato verificato |
| --- | --- |
| Last completed subphase | **COMPLETATA — FASE 3C-B3 — Reusable canonical geography selectors** |
| Current active phase | **FASE 3C-B4 — Profile Edit dual-write — IN PROGRESS** |
| Next safe action | **Eseguire il Blocco 2 READ-ONLY su funzione, RLS, policy e grant; feature gate/write disabilitati** |
| Production canonical geo areas | **56,304 — VERIFIED PRODUCTION** |
| Countries populated in canonical geography | **IT, FR, ES, CH, SI, PL — VERIFIED PRODUCTION** |
| Automatic profile residence backfill | **FORBIDDEN / DELIBERATELY EXCLUDED** |
| Mobile international parity | **NOT STARTED** |
| FASE 3C-B | **NOT COMPLETED — B1–B3 completate; B4 IN PROGRESS; B5–B7 non iniziate** |

**FASE 3C-B3 è l'ultima sottofase completata. FASE 3C-B4 è la fase attiva ed è IN PROGRESS:** preflight, B4.2 contract tests e implementazione/revisione statica B4.3 sono completati. Il runtime harness PostgreSQL 16 locale è **PASSED**. Il Preview Branch `b4-rpc-validation` è stato creato ma risulta **UNHEALTHY — MIGRATIONS: FAILED** durante la ricostruzione della history; dashboard e DevTools non espongono il dettaglio del workflow. La certificazione Supabase B4.3 resta differita in attesa del supporto. Una nuova decisione esplicita ha autorizzato **B4.4 IN PROGRESS**: Step 1 code-only/visuale completato e Step 2 static Production preflight completato con esito condizionale, con write remoti disabilitati. Non eseguire retry, reset, merge, migration manuali o modifiche Production. Il backfill automatico della residence resta escluso perché i campi legacy `interest_*` non costituiscono evidenza sufficiente della residenza effettiva dell'utente. La FASE 3C-B complessiva non è completata e la mobile international parity resta non iniziata.

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

**Stato: NOT COMPLETED — 3C-B1–3C-B3 COMPLETATE; 3C-B4 IN PROGRESS; 3C-B5–3C-B7 NOT STARTED.**

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

Il `DEFERRED MANUAL LIVE-DATA GATE` registrato in B3 è stato successivamente eseguito sulla Preview Vercel collegata a Supabase: **LIVE CANONICAL READ-DATA GATE: PASSED** per countries, root, children, ancestors e gerarchie reali dei sei Paesi. Restano gate obbligatori prima di marcare 3C-B4 completata: selector nel form reale, reset, write atomico, salvataggio e rilettura, compatibility legacy Italia, privacy e autorizzazioni.

#### 3C-B4 — Profile Edit dual-write

**Stato: IN PROGRESS — PREFLIGHT E B4.2 COMPLETATI; B4.3 LOCAL RUNTIME PASSED E CERTIFICAZIONE SUPABASE DIFFERITA; B4.4 STEP 1 COMPLETATO; STEP 2 STATIC PRODUCTION PREFLIGHT CONDITIONAL PASS; BLOCCO 1 COLONNE SUPERATO.** I nuovi valori devono essere canonical; per compatibilità scrivere anche i legacy soltanto dove necessario e semanticamente sicuro. Non ricostruire automaticamente residence dagli `interest_*`. Deliverable: preflight, write contracts e `docs/european-expansion/phase-3c-b4-transactional-profile-residence-rpc.md`.

**LIVE CANONICAL READ-DATA GATE: PASSED.** La verifica manuale read-only sulla Preview Vercel collegata a Supabase ha validato countries, root, children, ultimo livello, ancestors, profondità variabile, coerenza country/parent e caratteri internazionali per IT, FR, ES, CH con e senza District, SI e PL. Restano obbligatori in B4 i gate su selector nel form reale, reset con dati reali, dual-write, salvataggio, rilettura, compatibility legacy Italia, privacy e autorizzazioni.

L'ambiente dati della Preview non è dimostrabilmente separato da Production ed è classificato **POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL**. Il Current checkpoint registra FASE 3C-B3 come ultima sottofase completata e FASE 3C-B4 come fase attiva IN PROGRESS; la FASE 3C-B complessiva resta non completata.

Decisioni approvate per B4: prima integrazione limitata a Player/Athlete e Staff; country-only consentita; RPC transazionale additiva creata nel repository ma non applicata; Club, Institution e Fan esclusi; proiezione legacy testuale estera consentita; assenza di geography/interest nel PATCH significa non modificare. Nessuna migration può essere applicata e nessun write reale può essere eseguito senza una nuova approvazione esplicita.

B4.3 ha creato nel repository la migration additiva `20261204120000_transactional_profile_residence_rpc.sql` e il wrapper server, con scope atomico limitato ai campi residence. **MIGRATION ESEGUITA SOLTANTO NEL DATABASE TEMPORANEO LOCALE; NON APPLICATA A PREVIEW, STAGING O PRODUCTION**; nessuna RPC o write remoto è stato eseguito. Il default server `interest_country = 'IT'` e il fallback analogo in `ProfileEditForm` sono stati rimossi in B4.4 Step 1; i test di regressione verificano che un campo assente non introduca un default geografico implicito.

**B4.3 LOCAL RUNTIME HARNESS: PASSED; SUPABASE CERTIFICATION: BLOCKED — PREVIEW BRANCH UNHEALTHY / SUPPORT PENDING.** Il 2026-08-26 la migration e la matrice RPC sono state eseguite realmente in PostgreSQL 16 locale con fixture sintetiche: firma/grants, RLS rilevanti simulata, ruoli, reset, country-only, IT, FR, ES, CH con e senza District, SI, PL e rollback hanno superato i controlli. Nessuna connessione o write remoto è stato eseguito e il database temporaneo è stato eliminato. Il Preview Branch isolato esiste ma non ha completato la ricostruzione della history; la migration B4 resta non applicata a qualsiasi ambiente remoto.

**SUPABASE PREVIEW BRANCH WORKFLOW: BLOCKED — SUPPORT PENDING.** Il branch dedicato `b4-rpc-validation` è `UNHEALTHY`: il workflow del 2026-08-26 10:55:32 è fallito allo step `MIGRATIONS`. `Manage Branches → View Logs` mostra soltanto la riga fallita e il controllo DevTools read-only conferma che il click non genera richieste `actions/logs`; non sono quindi noti né la prima migration fallita né l'errore SQL. Il branch viene mantenuto temporaneamente per l'analisi del supporto. Non sono stati configurati GitHub o Vercel, non sono state applicate migration manuali e Production non è stata modificata. Il ticket supporto resta aperto ma non è più un blocker operativo. B4.4 Step 1 code-only ha superato la validazione visiva ed è stato ripulito dalla route QA temporanea; il feature gate write resta disabilitato; certificazione Supabase e read-after-write reale restano obbligatori prima della chiusura. Il runbook Step 2 è `docs/european-expansion/phase-3c-b4-production-deployment-preflight.md`.

#### 3C-B5 — Signup / onboarding

**Stato: NOT STARTED.** Solo dopo la validazione di Profile Edit, integrare selezione Paese/residence canonica nei nuovi account, garantendo compatibilità per Club, Player/Athlete, Staff, Fan e Institution.

#### 3C-B6 — Geographic interests

**Stato: NOT STARTED.** Integrare `profile_country_interests`, `profile_geo_area_interests` e `open_to_relocation`, separando chiaramente residence e interest geography.

#### 3C-B7 — Compatibility and regression

**Stato: NOT STARTED.** Verificare profili legacy Italia; nuovi profili Italia, FR, ES, CH, SI e PL; account type differenti; canonical-first; legacy fallback; assenza di regressioni mobile/API. Solo dopo B7 la FASE 3C-B potrà essere marcata **COMPLETATA**.

### FASE 3C-C — Opportunities canonical geography

**Stato: NOT STARTED.**

Sottofasi previste:

1. C1 — audit schema/write/read;
2. C2 — canonical geography schema;
3. C3 — migration additive;
4. C4 — dual-read/dual-write;
5. C5 — `OpportunityForm`;
6. C6 — filters;
7. C7 — regression/backward compatibility.

L'ownership attuale delle Opportunities deve restare invariata. Non alterare incidentalmente le semantics applicant/club.

### FASE 3C-D — Search / Discover / WhoToFollow

**Stato: NOT STARTED.**

Obiettivi futuri: country-aware filtering, geo-area filtering, scouting internazionale, country interests, territorial interests, relocation e ranking compatibile con legacy. Il lavoro dovrà essere separato, secondo necessità, in sottofasi audit/read/filter/ranking.

### FASE 3C-E — Maps

**Stato: NOT STARTED.**

Obiettivi futuri: `ClubMap`, `SearchMap`, supporto internazionale, coordinate canoniche, stadium coordinates, fallback legacy e performance. Per i Club esistenti, `club_stadium_lat/lng` è attualmente la fonte preferibile, quando presente, rispetto a generic `latitude/longitude`, sulla base dell'audit precedente. Le mappe non vengono modificate in questo task.

## FASE 4 — Internationalization / i18n

**Stato prudenziale: IMPLEMENTAZIONE i18n SOSTANZIALE PRESENTE; CERTIFICAZIONE COMPLETA 4A–4I NON ESEGUITA; FASE NON COMPLETATA.**

Il repository contiene un'implementazione i18n sostanziale ed è quindi più avanzato rispetto alla precedente dicitura `NOT STARTED`: sono verificabili catalogo `languages`, preferred language in `profile_preferences`, infrastruttura locale/provider, messaggi per le lingue attive e test dedicati. Queste evidenze non equivalgono tuttavia alla certificazione completa della FASE 4.

Prima di pianificare nuovo lavoro i18n è richiesto un audit dedicato di riconciliazione rispetto alle sottofasi 4A–4I. Questo aggiornamento documentale non avvia tale audit e non marca la FASE 4 come COMPLETATA.

Roadmap prevista:

- 4A — audit strings/locales;
- 4B — i18n infrastructure;
- 4C — Italian baseline;
- 4D — English;
- 4E — French;
- 4F — Spanish;
- 4G — language preference integration;
- 4H — metadata/SEO;
- 4I — fallback/regression.

Lingue iniziali: **IT, EN, FR, ES**. Lingue future: **PT, DE**. Non risultano dichiarate traduzioni complete.

## FASE 5 — Sports / Disciplines / Competition Model

**Stato: FOUNDATION PARTIAL / FUTURE WORK.**

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
| Last completed subphase | **FASE 3C-B3 — Reusable canonical geography selectors** |
| Current active phase | **FASE 3C-B4 — Profile Edit dual-write — IN PROGRESS** |
| Next safe action | **Eseguire e revisionare il Blocco 2 READ-ONLY (funzione/RLS/policy/grant); nessuna migration o write** |
| B4.3 local runtime harness | **PASSED — PostgreSQL 16, fixture sintetiche, nessuna connessione remota** |
| B4.3 Supabase certification | **BLOCKED — PREVIEW BRANCH UNHEALTHY / MIGRATIONS FAILED / SUPPORT PENDING** |
| B4.4 | **IN PROGRESS — STEP 1 PASS; STEP 2 static preflight CONDITIONAL PASS; Blocco 1 colonne PASS; ulteriori gate read-only pending** |
| FASE 3C-B | **NOT COMPLETED — B1–B3 completate; B4 IN PROGRESS; B5–B7 non iniziate** |
| Automatic residence backfill | **DELIBERATELY EXCLUDED** |
| Mobile international parity | **NOT STARTED** |

Non abilitare write remoti e non chiudere B4.4 prima della certificazione Supabase e del read-after-write reale esplicitamente approvati. Non iniziare la fase successiva.
