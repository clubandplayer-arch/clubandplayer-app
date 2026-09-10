# FASE 5A — Audit Sports / Disciplines / Competition Model

Data audit repository-only: 2026-09-04  
Baseline: `main` locale ricostruita dal commit `772a45b` (il checkout non dispone di remote configurato); branch dedicato `phase-5a-sports-audit`.  
Stato: **AUDIT COMPLETATO / repository-only; nessuna modifica comportamentale**.

## 1. Perimetro e limiti

L'audit confronta roadmap, migration versionate, schema ricostruibile, cataloghi TypeScript, API/server route, query Supabase, UI e test relativi a sport, discipline/varianti, ruoli/posizioni, categorie/livelli, organizzazioni sportive, competizioni e stagioni. Copre Signup/onboarding, Profile Edit per account type, esperienze, Opportunities/Applications, Search, Discover, WhoToFollow, feed/widget e Maps quando consumano questi valori.

Limiti verificabili:

- audit esclusivamente statico della repository Web/API;
- **Production non interrogata né modificata**: presenza di una migration nel repository non prova che sia applicata;
- nessuna migration creata, testata o applicata in 5A; nessun backfill;
- nessuna modifica a schema, dati, API, UI, RLS, grant, ownership o Applications;
- schema originario di `profiles` e `opportunities` non integralmente ricostruibile dalla history presente: diverse migration sono additive e presuppongono oggetti preesistenti;
- repository Mobile non aperta né modificata. La replica Mobile fino alla FASE 4 è **USER-REPORTED** e non è certificata da questo audit; la parity Mobile della FASE 5 resta **NOT STARTED / NON MODIFICATO**.

## 2. Inventario database e schema osservabile

### 2.1 Foundation canonica realmente presente

La migration `20260822120000_european_catalog_foundation.sql` è additiva e dichiara esplicitamente di non alterare/backfillare profili, Opportunities, Applications, registry o view (linee 1–4).

| Oggetto | Colonne/relazioni | Constraint e indici | Security osservabile | Seed |
| --- | --- | --- | --- | --- |
| `sports` | UUID `id`, `code`, `canonical_name`, flag/order/timestamp (linee 23–30) | PK; code lowercase; UNIQUE `code`; indice active/order (31–35) | RLS; SELECT anon/authenticated; CRUD admin basato su `profiles.is_admin` (118–163) | 13 righe, 12 attive e cricket inattivo (198–217) |
| `sport_disciplines` | UUID, FK obbligatoria `sport_id`, code/name, independently selectable, flag/order (37–46) | UNIQUE `(sport_id,code)`; indici sport e active/order (47–54) | medesimo modello RLS catalogo (118–163) | solo `association_football` e `futsal`, entrambe sotto football (219–233) |
| `sport_variants` | UUID, FK obbligatoria `discipline_id`, code/name/team size, flag/order (56–65) | team size positivo; UNIQUE `(discipline_id,code)`; indici discipline e active/order (66–74) | medesimo modello RLS catalogo (118–163) | solo football 11-a-side e 8-a-side (235–249) |
| `legacy_sport_mappings` | source/raw+normalized, FK sport obbligatoria, FK discipline/variant nullable, display label, status/note (95–105) | normalizzato lowercase/non vuoto; UNIQUE normalized source; indice target (106–113) | medesimo modello RLS catalogo (118–163) | alias italiani e alcuni enum legacy verso sport/discipline/variant (272–314) |

**Integrità incompleta:** le FK garantiscono che discipline e variant esistano, ma `legacy_sport_mappings` non contiene un constraint composito che provi che `discipline_id` appartenga a `sport_id`, né che `variant_id` appartenga alla disciplina indicata. Il seed usa join coerenti, ma write amministrativi potrebbero costruire terne semanticamente incompatibili.

**Trigger/funzioni/view/RPC sportivi:** nessun trigger, funzione, view o RPC specifico per i quattro oggetti sportivi è definito dalla migration. I campi `updated_at` non hanno un trigger osservabile in questa foundation. Non sono presenti grant/revoke espliciti per questi cataloghi; l'audit può attestare le policy RLS versionate, non gli ACL effettivi del database remoto.

### 2.2 Tabelle e colonne legacy dipendenti

| Oggetto | Campi sportivi osservabili | Stato canonico |
| --- | --- | --- |
| `profiles` | `sport`, `role`, `club_league_category`, `gender` e altri campi selezionati/scritti dalle route; tipi dichiarati come testo nel boundary profilo | nessuna FK sport/discipline/variant/role/category osservabile |
| `athlete_experiences` | `sport text`, `role text`, `category text`, `start_year/end_year`; FK profilo/club (migration player sections, linee 4–21) | nessuna FK canonica; stagione derivata dai due anni |
| `opportunities` | `sport`, `role`, `category`, `required_category`, `gender`, età; `role_group text` con check player/staff | nessuna FK sport/discipline/variant/competition/season; category duplicata semanticamente tra `category` e `required_category` nei path |
| `club_roster_members` | successiva migration aggiunge `sport text` e unicità player/sport; tabella base conserva ownership Club | stringa normalizzata solo applicativamente |
| `club_staff_members` | `staff_role text` (linee 3–17) | nessuna tassonomia/FK |
| registry FIGC | `registry_master_clubs`, discipline/raw e sport normalizzati importati da CSV | dominio italiano separato, non collegato ai cataloghi canonici |
| `applications` | riferisce Opportunity e identità applicant/Club, non duplica sport/competition | eredita semanticamente il contesto Opportunity |
| fan votes | `season_key` testuale | meccanismo stagionale specifico e non collegato alle esperienze/competizioni |

La migration delle esperienze abilita/forza RLS, lettura per profilo attivo e gestione owner, con trigger `updated_at` (linee 23–68). La tabella Staff Club abilita/forza RLS, espone membership attive, limita le write all'owner Club e possiede trigger `created_by` (linee 19–101). Applications conserva FK Opportunity, identity su `auth.users`, indici, trigger timestamp e policy applicant/Club (migration MVP, linee 5–13 e 41–110). Questi contratti non devono essere incidentalmente modificati dalla FASE 5.

### 2.3 Categorie, livelli, competizioni e stagioni

- **Categorie/livelli:** non esiste un catalogo DB canonico. `lib/opps/categories.ts` contiene mappe in-memory per sport (linee 5–107), includendo campionati, livelli, enti di promozione, youth, amateur e `Altro` nello stesso namespace. Molti valori (`Serie D`, `Eccellenza`, `Promozione`, CSI/UISP/CSEN...) sono implicitamente italiani; `FIP` compare persino nell'elenco Calcio.
- **Competition/organization:** nessuna tabella canonica per sports organizations, competitions, competition levels/groups/formats o territorial scopes; il registry FIGC è una sorgente italiana distinta, non un competition catalog europeo.
- **Season catalog:** assente. Le esperienze persistono `start_year/end_year`; la UI genera label stagionali al runtime e l'API converte `YYYY/YY`. Fan votes usa un altro `season_key`.
- **Age class:** assente come catalogo. Le Opportunities usano age bracket UI e/o `age_min`/`age_max`; `Giovanili` è anche una category generica.
- **Gender:** nessun catalogo relazionale. Il normalizzatore Opportunity accetta alias multilingua ma persiste codici legacy `uomo`, `donna`, `mixed` o fallback inglesi (`lib/opps/gender.ts`, linee 3–20 e 29–50).
- **Player/Staff roles:** nessuna tabella canonica. Ruoli per sport e Staff sono array italiani in `lib/opps/constants.ts` (linee 5–55). Il ruolo Staff è trasversale, ma viene trattato nella stessa vocabulary di ruoli sport-specifici.

### 2.4 Migration history, seed e stato applicazione

Migration rilevanti presenti:

- `20251115100000_add_category_to_opportunities.sql`: `category text` + indice;
- `20251210100000_job1_player_sections.sql`: esperienze testuali + RLS/trigger;
- `20260720100000_club_roster_members.sql`, `20260720102000_roster_unique_player_sport.sql`, `20260720103000_normalize_pallavolo_to_volley.sql`;
- `20260723090000_applications_mvp.sql`;
- `20260822120000_european_catalog_foundation.sql`;
- `20261107110000_add_role_group_to_opportunities.sql` (include DML legacy verso `player`);
- `20261108100000_club_staff_members.sql`;
- migration registry FIGC e relative importazioni.

Per 5A nessuna di queste è stata applicata/testata. La loro presenza è verificata soltanto nel Git repository; senza query a `supabase_migrations.schema_migrations` o introspezione autorizzata non si certifica lo stato remoto. Non esistono seed europei verificabili per competizioni/stagioni/organizzazioni/categorie/ruoli.

## 3. Modello semantico: canonical vs legacy

| Concetto | Persistenza corrente | Canonico? | Normalizzazione/localizzazione | Problema |
| --- | --- | --- | --- | --- |
| Sport catalog | UUID + code in `sports` | sì, isolato | catalogo TS duplica DB | non usato dai write principali |
| Profile/Club sport | `profiles.sport` text | legacy | `normalizeSport` corregge solo `Pallavolo → Volley`; label localizzata solo in presentazione | nessuna identità stabile; default implicito `Calcio` nei form |
| Discipline | UUID in `sport_disciplines` | sì, solo football/futsal | resolver legacy può risolvere | nessuna colonna nei profili/esperienze/Opportunity |
| Variant | UUID in `sport_variants` | sì, solo calcio 11/8 | resolver legacy può risolvere | non connesso ai path runtime |
| Player position/role | `role text` | no | array dipendente dalla stringa sport; i18n display-only | mismatch e alias/casing |
| Staff role | `profiles.role`, experience `role`, membership `staff_role` text | no | lista trasversale italiana; i18n display-only | tre fonti potenzialmente divergenti |
| Club category / Opportunity category | text | no | dizionario principalmente italiano; localizzazione parziale display-only | mescola competition, tier, organization, age/format |
| Competition | testo implicito in category/club name | no | nessuna | omonimie e impossibilità country/season-aware |
| Season | experience years / UI label / fan `season_key` | no | parser/formatter applicativo | formati e domini diversi |
| Gender | text | semi-controlled legacy | alias normalizzati; label localizzate | doppia strategia DB italiana/inglese |
| Age | age_min/max o bracket UI | no catalog | mapping applicativo | non equivale ad age class federale |

La normalizzazione generica rimuove diacritici, converte in lowercase snake-case (`legacyMappings.ts`, linee 34–42). Gli alias sport sono duplicati tra SQL e TypeScript (`legacyMappings.ts`, linee 92–134). La controlled vocabulary traduce **solo la visualizzazione** e restituisce il valore sconosciuto invariato (`controlledVocabulary.ts`, linee 60–70); questo è il comportamento corretto da preservare per non tradurre dati persistiti, ma il set alias non coincide interamente con catalogo/DB e non risolve identità.

## 4. Flussi read/write

### 4.1 Signup e onboarding

- Signup non raccoglie sport/ruolo/competition; crea l'identità e rinvia alla scelta account type/profile completion.
- Onboarding role route scrive il tipo account, non il dominio sportivo.
- La completezza del profilo richiede sport/role per alcuni account type, quindi il primo write sportivo reale avviene in Profile Edit, non nella foundation canonica.

### 4.2 Profile Edit Player e Staff

- Lo stato UI inizializza Club a `Calcio`/`Altro`; il load imposta Player e Club su `Calcio` se il dato manca (`ProfileEditForm.tsx`, linee 292–324 e 485–504). Ciò è una dipendenza italiana e può generare write involontari.
- Player e Staff condividono `profiles.sport`/`role`; i ruoli Player dipendono dalla lookup per sport, mentre Staff usa una lista globale (`ProfileEditForm.tsx`, linee 313–322).
- Il payload salva stringhe trim, non ID canonici (`ProfileEditForm.tsx`, linee 654–688 e 718–745). La route `/api/profiles/me` ammette questi campi testuali e normalizza solo alias sport noti.
- Institution/Fan azzerano sport/role/category; Club salva sport e `club_league_category`. Non esiste multi-sport profilo: un solo `sport` testuale.

### 4.3 Esperienze precedenti

- UI offre season generate, Club libero, sport da lista, ruoli sport-dependent o Staff globali, categorie per sport (`ProfileEditForm.tsx`, linee 1318–1402).
- GET `/api/profiles/me/experiences` legge `sport/role/category/start_year/end_year`; POST valida la label season e sostituisce l'intero set di esperienze. I valori sport/role/category restano stringhe e il Club può essere associato tramite match testuale.
- Schema e API supportano più esperienze, ma non una pluralità di sport strutturata sul profilo né competition/organization/season IDs.

### 4.4 Club, roster e Staff

- Club Profile Edit usa gli stessi array locali di Opportunities e persiste un singolo sport/category.
- Roster membership possiede un `sport text` per riga e un vincolo unique player/sport; le route normalizzano l'alias, ma non validano contro `sports`.
- Staff membership salva `staff_role text`, con fallback al ruolo profilo nelle read. Un cambio in una fonte non garantisce sincronizzazione delle altre.
- Registry claim/search espone discipline FIGC trasformate in stringhe Club-and-Player; non usa `sport_disciplines.id`.

### 4.5 Opportunity create/edit/detail/list e Applications

- `OpportunityForm` parte da `Calcio`, usa `SPORTS`, `SPORTS_ROLES`, categorie in-memory e `role_group` player/staff; invia stringhe (`OpportunityForm.tsx`, linee 113–156).
- La validazione ruolo è obbligatoria soltanto per alcuni sport (`Calcio`, `Calcio a 8`), pur mostrando ruoli per molti altri: contratto incoerente.
- API create/edit, repository, detail/list/card e feed selezionano e rendono `sport`, `role`, category/gender testuali. Non esiste dual-read/write sport canonico equivalente alla geografia.
- Applications non scrive un secondo sport: conserva l'Opportunity e l'applicant. Qualunque evoluzione deve lasciare invariati ownership, visibility/status e payload legacy finché Mobile pubblicato o altri client li consumano.

### 4.6 Search, Discover, WhoToFollow, feed/widget e Maps

- Search normalizza l'input con il piccolo alias map e filtra `profiles.sport` con `ilike`; ruolo è anch'esso testuale. Canonical IDs/discipline/competition non sono accettati.
- Discover/follow suggestions confrontano lo sport viewer con `eq` o `ilike`; `sportScope=mine` dipende dall'esatta stringa del profilo. WhoToFollow principale usa `eq('sport', profile.sport)` nei fallback.
- Starter pack/highlights applicano tentativi progressivi su sport/country/city e Opportunities testuali. Feed widget e card presentano sport/role/category senza identity canonica.
- Maps applica `ilike` a `profiles.sport` e `club_league_category`; non filtra discipline/competition. Il boundary privacy organization-only già stabilito resta fuori scope e deve essere preservato.
- Non è stata trovata una server action sportiva dedicata: i boundary rilevati sono route API e query Supabase dirette.

## 5. Stato reale della foundation

| Area | File/tabella presente | Collegata a read/write reali? | Valutazione 5A |
| --- | --- | --- | --- |
| Sports | sì, DB + TS + legacy resolver | **no**: UI/API persistono stringhe | PARTIAL |
| Disciplines | sì, soltanto football/futsal | no | PARTIAL/ISOLATED |
| Variants | sì, soltanto 11/8-a-side | no | PARTIAL/ISOLATED |
| Player roles | array per stringa sport | sì, ma soltanto legacy | LEGACY |
| Staff roles | array globale + più colonne testuali | sì, legacy e duplicato | LEGACY |
| Categories/levels | array italiani misti | sì, legacy | LEGACY / IT-CENTRIC |
| Competition catalog | no | no | NOT STARTED |
| Season catalog | no | no | NOT STARTED |
| Controlled-vocabulary i18n | sì | sì, presentation-only su varie superfici | PARTIAL; non identity layer |
| Multi-sport | solo esperienze/roster possono avere righe diverse | profilo/Club/Opportunity singolo sport | INCOMPLETO |

Conclusione: la dicitura roadmap **FOUNDATION PARTIAL** è confermata. L'esistenza di quattro tabelle non equivale a un modello operativo: gli UUID canonici non attraversano Profile/Experience/Opportunity/Search e competition/season/organization non esistono.

## 6. Gap e rischi

1. **Sport ↔ ruolo:** lookup basata su label/casing; valori storici sconosciuti o ruoli di un altro sport passano in alcuni API path. La FK futura deve impedire mismatch senza invalidare legacy.
2. **Categorie italiane:** Serie/Eccellenza/Promozione/EPS italiani non sono riutilizzabili come livelli europei. `category` oggi fonde tier, competition, organization, age class e format.
3. **Label localizzata ↔ DB:** la UI traduce in presentazione ma persiste label legacy. Salvare accidentalmente una label localizzata creerebbe nuove varianti dello stesso valore.
4. **Storico sconosciuto:** fallback display è utile, ma filtri exact/ilike, ruolo e categorie non riconoscono tutti gli alias.
5. **Staff trasversale:** professioni Staff possono essere globali o sport-scoped; un unico `role` non esprime scope/qualifica e membership può divergere dal profilo.
6. **Disciplina errata:** manca integrità cross-table su mapping sport/discipline/variant e nessun adapter runtime valida la catena.
7. **Competizioni duplicate/omonime:** senza country, organization, gender, age class e season, `Serie A`, `A2`, `B` non sono identità.
8. **Stagioni:** `YYYY/YY`, due anni, fan `season_key` e potenziali calendari annuali/cross-year richiedono un contratto non italiano-universale.
9. **Search/Opportunity:** filtri testuali non possono combinare sport/discipline/competition canonici e rischiano false positive con `ilike`.
10. **Mobile/API:** client pubblicati possono dipendere da campi e label testuali. Rimozioni, rename, required IDs o payload-only canonical romperebbero backward compatibility. La parity Mobile fino a FASE 4 è user-reported; FASE 5 Mobile resta da progettare nella repo dedicata.
11. **Legacy Italia:** backfill euristico o constraint immediatamente `NOT NULL` può invalidare profili, esperienze e Opportunities storiche. Nessuna traduzione o modifica automatica dei dati utente è ammessa.
12. **Duplicazione cataloghi:** seed SQL, catalog TS, alias TS, constants, categories e vocabulary possono divergere senza un'unica source of truth/versione.
13. **Security drift:** policy catalogo consentono CRUD a `profiles.is_admin`, mentre altri admin path usano segnali più recenti; va riconciliato in fase dedicata prima di estendere cataloghi, senza cambiare RLS in 5A.
14. **Schema remoto ignoto:** grants, owner, nullability e oggetti installati non sono certificabili repository-only.
15. **Default calcio:** Profile/Opportunity form inizializzano `Calcio`; per espansione internazionale ciò può trasformare assenza di scelta in dato italiano.

## 7. Contratti invarianti da preservare

- additive-first: campi testuali legacy restano leggibili/scrivibili durante la transizione;
- nuovi riferimenti canonici nullable inizialmente; nessun `NOT NULL` o backfill automatico senza audit dati e autorizzazione;
- valore persistito stabile e language-neutral; localizzazione esclusivamente in presentazione;
- unknown legacy value conservato e mostrato, non cancellato né riclassificato automaticamente;
- sport/discipline/variant/role/category/competition devono essere validati come catena coerente;
- competition identity almeno organization + country/scope + sport/discipline + denominazione stabile; la label non è identity;
- season non presume sempre `YYYY/YY`; category non presume piramide italiana;
- ownership Opportunity (`club_id`, `owner_id`, `created_by`), visibility/status e RLS invariati;
- Applications applicant/Club identity, status, ownership, RLS e payload invariati;
- Profile/experience write owner-only e privacy/Maps invariati;
- API mantiene campi legacy; eventuali campi canonicali sono additivi e dual-read/dual-write versionati;
- nessuna modifica automatica dei dati utente e nessun accesso Production senza autorizzazione.

## 8. Decisioni necessarie per 5B

1. Definire ID/code stabili e ownership della source of truth (DB vs manifest versionato), inclusa strategia di localizzazione names/aliases.
2. Separare formalmente sport, discipline, variants, player positions, staff roles, organization, competition, level/group, age class, gender, format, territorial scope e season.
3. Decidere quali ruoli sono globali, sport-scoped, discipline-scoped o variant-scoped; supportare many-to-many dove necessario.
4. Definire identity/versioning di organization/competition e regole country-aware/multi-country.
5. Definire season model per annuale, cross-year, split season e display label senza usare la label come chiave.
6. Definire compatibilità: canonical-first → legacy mapping → raw legacy fallback; semantics `absent/reset/legacy/canonical` per write.
7. Definire payload API additivo e capability/version negotiation compatibile con Mobile pubblicato.
8. Decidere multi-sport per Profile/Club/Staff/Player senza anticipare la FASE 6; in FASE 5 preparare soltanto il contratto.
9. Classificare i valori italiani esistenti prima di qualunque mapping: competition, level, organization, age class o format.
10. Stabilire governance e provenienza dei cataloghi europei: federation authority, stable external IDs, validity dates e alias, senza popolare cataloghi in 5B.

## 9. Suddivisione prudenziale proposta

La sequenza proposta dall'utente è confermata, con gate espliciti:

- **5A — audit Sports / Disciplines / Competitions:** questo documento; chiusa repository-only.
- **5B — contratto canonico e regole di compatibilità:** solo decision record/schema logico/payload contracts; niente migration/runtime.
- **5C — schema additivo e migration:** DDL nullable, integrità relazionale, RLS/grant/ownership esplicitamente revisionati; runtime PostgreSQL locale prima di applicazioni remote.
- **5D — cataloghi e seed controllati:** manifest con provenance/versioning, seed idempotente e cataloghi iniziali autorizzati; niente dati utente.
- **5E — dual-read / dual-write e adapter server:** canonical-first + legacy fallback, field-aware, metriche unknown; nessuna UI.
- **5F — profili ed esperienze:** Player/Staff/Club secondo decisione 5B; Institution/Fan solo se semanticamente coinvolti.
- **5G — Opportunities e Applications:** contesto canonico additivo preservando ownership/RLS/payload/applications.
- **5H — Search / Discover / WhoToFollow:** filtri/ranking canonicali e fallback legacy; feed/widget inclusi.
- **5I — UI, filtri e controlled vocabulary:** selector, localizzazione presentation-only, rimozione dei default impliciti con smoke Preview.
- **5J — regressione, backward compatibility e certificazione:** Italia legacy, sei Paesi, API old/new client, performance/security e handoff Mobile separato.

Ogni sottofase resta soggetta ad autorizzazione separata. 5B non autorizza 5C.

## 10. Criteri di accettazione

### 5A (soddisfatti repository-only)

- inventario schema/migration/security/seed con limiti espliciti;
- tracciati tutti i read/write path richiesti;
- matrice canonical vs legacy e foundation wiring verificati;
- contratti e rischi esplicitati;
- nessuna migration/backfill/query remota/modifica runtime/RLS/grant/ownership/Applications/Mobile.

### Gate proposti per 5B

- glossario e modello logico non ambiguo;
- invarianti cross-entity e cardinalità;
- canonical codes language-neutral + localizzazione separata;
- strategia unknown/alias/versioning/deprecation;
- dual-read/write order e payload backward-compatible;
- matrice d'impatto Web/API/Mobile;
- decisioni documentate su country scope, season, gender, age class e staff roles;
- nessun DDL/DML o runtime change.

## 11. Test e verifiche

Test applicabili a 5A:

- ricerca statica con `rg` su migration, API, query, UI e test;
- `git diff --check`;
- lint, typecheck, suite unit completa e build per assicurare che i soli documenti non introducano regressioni. Esito: `pnpm test:unit` **PASS (293/293)**; `pnpm lint` **PASS**; `pnpm typecheck` **PASS**; `pnpm build` **WARNING/BLOCKED esclusivamente dal mancato fetch di Inter e Righteous da Google Fonts**, dopo l’avvio corretto della build;
- verifica che non siano stati aggiunti file SQL/migration o modifiche runtime.

Non applicabili in 5A: test PostgreSQL migration/constraint, smoke API mutativi, smoke Preview e screenshot. Non esiste modifica UI percepibile. **Nessuna verifica manuale/visiva richiesta all'utente per 5A.**

## 12. Checkpoint operativo 5A

| Voce | Stato |
| --- | --- |
| Fase/sottofase | FASE 5A |
| Stato | **COMPLETATA — AUDIT repository-only** |
| Codice modificato | no; soli documenti |
| Migration creata/testata/applicata | no / non applicabile / no |
| Production interrogata/modificata | no / no |
| RLS/grant/ownership modificati | no |
| Applications modificata | no |
| Impatto Web/API | nessun comportamento; inventario e gate futuri |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Mobile fino a FASE 4 | **USER-REPORTED REPLICATED; non verificato in questa repository** |
| Manuale/visuale | non applicabile |
| Blocker | nessuno per chiudere l'audit; decisioni 5B aperte |
| Prossimo passaggio autorizzabile | **5B — contratto canonico e compatibilità, documentale** |

**Stop gate:** non iniziare 5B senza autorizzazione esplicita dell'utente.
