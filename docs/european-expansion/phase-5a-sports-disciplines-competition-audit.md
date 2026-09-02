# FASE 5A — Audit Sports / Disciplines / Competition Model

## Stato e perimetro

| Voce | Esito 5A |
| --- | --- |
| Fase / sottofase | **FASE 5A — audit repository-only** |
| Stato | **AUDIT COMPLETATO; 5B NOT STARTED** |
| Codice runtime modificato | **No** |
| Schema / dati modificati | **No** |
| Migration creata / testata / applicata | **No / N/A / No** |
| Production interrogata / modificata | **No / No** |
| RLS, grant, ownership, Applications | **Non modificati** |
| Web / API | **Auditati, comportamento non modificato** |
| Mobile | **NOT STARTED / NON MODIFICATO** |
| Smoke manuale o visuale | **Non applicabile: nessuna modifica percepibile** |

L'audit confronta la roadmap con schema e migration versionati, cataloghi/seed, query Supabase, API e superfici Web. Non certifica lo schema effettivamente installato in alcun ambiente remoto: nel repository non esiste un ledger affidabile delle migration applicate e Production non è stata interrogata.

## Metodo ed evidenze

Inventario ottenuto con ricerche repository-wide su DDL (`create/alter table`, FK, constraint, indici, funzioni, trigger, view, RLS, policy e grant), chiamate `.from(...)`, campi e vocabolari sportivi. Evidenze principali:

- `supabase/migrations/20260822120000_european_catalog_foundation.sql:23-136`: cataloghi canonici, FK, indici e RLS;
- `supabase/migrations/20260822120000_european_catalog_foundation.sql:198-249`: seed sport/discipline/variant;
- `lib/taxonomy/catalog.ts:58-113` e `lib/taxonomy/legacyMappings.ts:1-195`: mirror TypeScript e alias;
- `supabase/migrations/20251210100000_job1_player_sections.sql:4-55`: esperienze Player testuali;
- `components/profiles/ProfileEditForm.tsx:15-24,93-172,399-535`: cataloghi locali e payload profilo/esperienze;
- `app/api/profiles/me/experiences/route.ts:14-133`: conversione stagione e replace delle esperienze;
- `components/opportunities/OpportunityForm.tsx:8-17,70-166,245-412`: controlled vocabulary locale e payload Opportunity;
- `app/api/opportunities/route.ts:100-139,276-357` e `app/api/opportunities/[id]/route.ts:20-27,211-272`: read/write Opportunity;
- `app/api/search/route.ts:219-273,361-377,505-590`: ricerca profili e Opportunity;
- `app/api/suggestions/who-to-follow/route.ts:75-109,204-239` e `app/api/follows/suggestions/route.ts:136-169,196-255`: suggerimenti basati su `profiles.sport` testuale;
- `lib/i18n/controlledVocabulary.ts:4-69`: traduzione presentation-only di alias persistiti.

I riferimenti `file:line` descrivono la baseline auditata e sono verificabili con `nl -ba`/`rg -n`; potranno cambiare dopo fasi successive.

## 1. Schema e database attuale

### Foundation canonica realmente presente

| Oggetto | Identità / relazioni | Constraint e indici | RLS / grant | Collegamento runtime |
| --- | --- | --- | --- | --- |
| `sports` | UUID, `code`, `canonical_name` | code lowercase, UNIQUE `code`, active/order index | RLS; read pubblico; write admin | **No read/write path prodotto trovato** |
| `sport_disciplines` | UUID, FK `sport_id → sports` restrict | UNIQUE `(sport_id, code)`, lookup/order | come sopra | **No** |
| `sport_variants` | UUID, FK `discipline_id → sport_disciplines` restrict | UNIQUE `(discipline_id, code)`, `team_size > 0` | come sopra | **No** |
| `legacy_sport_mappings` | stringa normalizzata → sport, disciplina e variant nullable | UNIQUE normalized value, target index | read pubblico; write admin | adapter TS/test, **non usato nei write reali** |

La migration è additiva e dichiara esplicitamente di non alterare/backfillare profili, Opportunities, Applications, registry o view (`20260822120000...:3-4`). Non contiene trigger/funzioni sportivi. Il DDL crea policy `SELECT` per anon/authenticated e policy mutative admin; non contiene `GRANT` espliciti per questi cataloghi. Una migration generica successiva concede operazioni sulle tabelle esposte (`20261113110000_data_api_explicit_grants.sql:1-28`): l'interazione effettiva tra grant e RLS va ricostruita e testata in 5C, senza assumere che la presenza di RLS equivalga da sola al least privilege.

### Seed e copertura

- 13 sport nel catalogo TS/SQL; cricket è inattivo.
- Discipline canoniche soltanto per football (`association_football`, `futsal`).
- Variant soltanto per association football (`eleven_a_side`, `eight_a_side`).
- Alias legacy per nomi italiani/inglesi e alcune grafie; la normalizzazione è trim/lowercase/diacritics nel modulo TS, mentre il DB richiede una stringa già normalizzata.
- Nessun catalogo canonico trovato per **sports organizations, Player positions, Staff roles, category/age class, competition, competition level/group, season, gender, format o territorial scope**.

### Strutture parallele/legacy

| Area | Stato repository |
| --- | --- |
| `profiles` | `sport`, `role`, `gender`, `club_league_category` e campi affini sono stringhe legacy; nessuna FK ai cataloghi sportivi trovata. |
| `athlete_experiences` | `club_name`, `sport`, `role`, `category` testuali; anni numerici e `is_current`; nessun competition/season ID. RLS public read + owner management. |
| `opportunities` | `sport`, `role`, `role_group`, `category`, `required_category`, `gender`, età e località sono testuali/numerici; nessuna FK sportiva. `category` e `role_group` sono aggiunte additive indicizzate/parzialmente vincolate. |
| `applications` | Riferisce Opportunity e identità applicant/Club; non duplica una tassonomia canonica. Dipende semanticamente dai campi Opportunity esistenti. |
| Registry FIGC | `registry_master.sport_normalizzati` e `registry_club_disciplines` conservano stringhe importate/normalizzate e mapping Club-and-Player, ma non FK a `sports`/`sport_disciplines`. È specifico del registro italiano. |
| Roster | `club_roster_members.club_sport` è testo derivato dal Club tramite trigger e parte dell'unicità Player/sport; non è un canonical ID. |
| Fan votes | `season_key` è una chiave testuale calcolata da una funzione specifica; non è un season catalog sportivo. |

Non sono emerse view/RPC canoniche per taxonomy o competition. Le view preesistenti (per esempio `athletes_view`) espongono campi profilo testuali. La migration foundation è **presente** nel repository; il suo stato applicato non è stato verificato da remoto.

## 2. Read/write path

| Flusso | Read | Write | Esito semantico |
| --- | --- | --- | --- |
| Signup | crea credenziali; nessun selector sport | nessun canonical sport | non coinvolto direttamente |
| Onboarding ruolo | account type, non ruolo sportivo | `profiles.account_type/type` | “role account” distinto ma naming ambiguo |
| Profile Edit Player | `profiles.sport/role`, esperienze | stringhe da `SPORTS`, `SPORTS_ROLES`, `CATEGORIES_BY_SPORT`; API esperienze fa replace | legacy-only; ruolo Player dipende dallo sport in UI |
| Profile Edit Staff | stessi campi | `STAFF_ROLES` testuali | Staff role trasversale allo sport; nessun ID |
| Club | `sport`, `club_league_category` | opzioni locali sport/categoria; registro può precompilare stringhe | categoria principalmente calcistica/italiana |
| Institution | profilo generico e `role='Ente'` in verification | nessuna sports organization canonica | federazione/lega sono account/label, non entity graph |
| Fan | nessun write taxonomy strutturato | nessuno | sport può apparire solo tramite superfici generiche |
| Esperienze | lista pubblica testuale | API converte `YYYY/YY` in start/end e sostituisce tutte le righe | “season” è formato UI, non catalogo |
| Opportunity create/edit | liste locali sport/role/category/gender | stringhe normalizzate solo in modo locale; ownership/geo preservate | nessun ID sport/competition |
| Opportunity detail/list/feed/widget | select stringhe Opportunity | nessuno | label localizzata a presentation dove coperta |
| Applications | join a Opportunity e profilo | candidatura conserva contratti ownership | eredita semantica sportiva dell'Opportunity; non va alterata in 5B |
| Search | profili e Opportunities tramite `ilike/eq` su testo | nessuno | exact/alias non uniformi; nessun join catalogo |
| Discover / WhoToFollow | profilo viewer/candidati, ranking su `sport` stringa | follow separato | stesso valore testuale richiesto per sport affinity |
| Feed/widget | legge profilo/Opportunity testuali | i post Opportunity legacy possono scrivere sport/role direttamente | hardcode “Serie D”, `goalkeeper`, gender in CTA/trending |
| Maps | filtra `profiles.sport`, `gender`, `club_league_category`; Opportunity pin legge testo | nessuno | taxonomy influenza filtri/metadata, non placement |
| API/server | numerose route Supabase dirette, nessun adapter taxonomy condiviso | profilo, esperienza e Opportunity scrivono stringhe | foundation non integrata |

Le due implementazioni WhoToFollow selezionano `sport` e `role` da `profiles`; il ranking usa uguaglianza della stringa sport. Search seleziona gli stessi campi e Opportunity. Non risultano query runtime a `sports`, `sport_disciplines`, `sport_variants` o `legacy_sport_mappings` fuori da test/foundation.

## 3. Matrice canonical vs legacy

| Concetto | Canonical ID disponibile | Persistito oggi nei flussi | Normalizzazione | Localizzazione |
| --- | --- | --- | --- | --- |
| Sport | `sports.id` + code | `profiles/opportunities/experiences/roster`: testo | `normalizeSport`/alias solo in alcuni caller | presentation-only via vocabulary, fallback raw |
| Discipline | `sport_disciplines.id` | quasi mai; registry usa testo separato | alias parziale | catalog name inglese; nessun flusso i18n completo |
| Variant | `sport_variants.id` | non collegato | alias parziale | non collegata |
| Player role/position | No | `role` testo | liste per sport + alias incompleti | `localizeSportRole`, fallback raw |
| Staff role | No | `role` testo | lista trasversale | alias presentation-only |
| Category/age class | No | `category`, `required_category`, `club_league_category` testo; età numerica | liste soprattutto calcio italiano | fallback raw/traduzioni parziali |
| Gender | No | testo Opportunity/profilo | adapter maschile/femminile/misto | tradotto soltanto in presentazione |
| Competition/org/level/group/format/scope | No | nomi impliciti in category/league o testo | No | No |
| Season | No | experience start/end; `season_key` fan vote | parser singolo `YYYY/YY`; chiave vote distinta | label formattata |

**Regola osservata e da preservare:** le funzioni i18n restituiscono una label e non devono essere usate per riscrivere il database. I valori sconosciuti ricadono sul valore raw, importante per lo storico italiano. L'attuale foundation supporta multi-sport a livello di elenco, ma la gerarchia disciplina/variant è sostanzialmente football-only e nessun percorso applicativo persiste gli ID.

## 4. Contratti invarianti

5B–5J devono preservare esplicitamente:

1. `opportunities.club_id`, `owner_id`, `created_by`, visibility/status e relative policy/trigger;
2. applicant identity, Club ownership, unicità e permissions delle Applications;
3. payload API correnti: campi stringa restano accettati e restituiti durante la compatibilità;
4. nessuna traduzione di valori persistiti e nessuna riscrittura automatica di profili/esperienze/Opportunity;
5. canonical-first solo quando un ID esplicito e valido esiste, quindi alias mapping e infine raw legacy;
6. nessuna inferenza competition/category da paese, lingua o label;
7. categorie, piramidi e stagioni country-/organization-aware: non imporre Serie/Categoria italiana agli altri Paesi;
8. aggiunte nullable e dual-read/dual-write prima di eventuali deprecazioni;
9. Mobile pubblicato può dipendere dagli attuali payload/stringhe: nessuna rimozione/rename o nuova obbligatorietà senza parity separata.

## 5. Gap della foundation

La foundation è **parziale e scollegata**, non “completa”:

- manca il grafo sport → discipline → variant nei profili, esperienze, Club e Opportunity;
- mancano ruoli/posizioni con compatibilità sportiva e ruoli Staff globali/opzionalmente specializzati;
- mancano organization, competition, level/group, age class/category, gender, season, format e territorial scope;
- mancano chiavi country/organization e regole temporali per competizioni omonime;
- manca un adapter server unico per validazione, canonical-first read e payload backward-compatible;
- cataloghi SQL e TS duplicano seed e possono divergere;
- controlled vocabulary traduce alias conosciuti ma non certifica la validità o l'appartenenza allo sport;
- Search, recommendations e Maps confrontano stringhe e possono perdere match tra alias equivalenti;
- registry FIGC costituisce una fonte italiana separata, non un competition catalog europeo.

## 6. Rischi

| Rischio | Evidenza / impatto | Mitigazione richiesta |
| --- | --- | --- |
| Sport/ruolo mismatch | validato in alcuni form ma non dal DB/API uniformemente | relation table + validazione server, fallback legacy |
| Categorie calcio italiano | Serie D, categorie giovanili e `club_league_category` hardcoded | age class separata da competition/level; scope country/org |
| Label localizzata = valore DB | helper presentation potrebbero essere riusati nel write | DTO separati `code/id/raw/label`; test “no translated writes” |
| Storico sconosciuto | fallback raw diffuso | non bloccare read; mapping esplicito e report dry-run |
| Staff cross-sport | `STAFF_ROLES` intenzionalmente trasversale | ruoli globali, compatibilità sport opzionale |
| Disciplina sotto sport errato | FK garantisce parent solo nel catalogo, non nei payload | validate tuple server-side e FK composite/unique adeguate |
| Competizioni duplicate/omonime | nessun modello attuale | stable source identity + organization/country/season scope |
| Stagioni eterogenee | parser assume `YYYY/YY`; fan vote usa altra chiave | season identity e date boundaries; label non identificatore |
| Filtri incompatibili | Search/Opportunity/Maps usano testo/alias differenti | dual filter canonical + bounded legacy aliases |
| Mobile pubblicato | payload stringa potenzialmente consumato dal client | schema additivo/nullabile; mantenere campi e valori legacy |
| Dati italiani rotti | backfill ambiguo o category globalizzata | nessun auto-backfill; audit/dry-run; Italy regression gate |
| Grant/RLS inattesi | grant generici + policy cataloghi | matrice runtime anon/auth/owner/admin/service in 5C |

## 7. Decisioni necessarie per 5B

1. Identità: UUID DB come reference canonica, code stabili come wire key o entrambi.
2. Cardinalità profilo/Club: sport principale più relazioni multi-sport, oppure solo multi-sport ordinato.
3. Tassonomia: distinguere discipline e playing variants; definire se alcuni sport sono selezionabili senza disciplina.
4. Ruoli: catalogo Player sport-specific; Staff global role con eventuale specializzazione; non confondere con account type.
5. Competition graph: organization → competition → edition/season → level/group, con country/territorial scope e source identity.
6. Category: separare age class, competition level e marketing/legacy label; definire gender come dimensione controllata ma non sempre binaria/obbligatoria.
7. Compatibilità: forma esatta dei payload duali e precedenza canonical ID → mapped legacy → raw.
8. Catalog ownership/provenance: chi può creare/aggiornare record e quali fonti ufficiali sono richieste; nessun seed esteso prima della decisione.
9. Mobile contract freeze: elenco dei campi legacy che devono restare invariati fino alla fase Mobile dedicata.

## 8. Suddivisione proposta

L'audit **conferma** 5A–5J con un chiarimento di responsabilità:

- **5B** contratto canonico, entity graph, naming, cardinalità, invarianti e compatibility matrix, solo documentale/test di contratto;
- **5C** schema additivo e migration, includendo matrice RLS/grant/constraint e harness PostgreSQL locale; nessuna applicazione automatica;
- **5D** cataloghi controllati, provenance, seed idempotenti e alias (non dati utente);
- **5E** adapter server e dual-read/dual-write field-aware;
- **5F** profili, Club e athlete experiences;
- **5G** Opportunities, preservando integralmente Applications/ownership;
- **5H** Search, Discover e WhoToFollow (Maps soltanto per regressione dei filtri coinvolti);
- **5I** UI, selector, filtri e label localizzate senza tradurre il persistito;
- **5J** regressione API/Web, backward compatibility Italia/Mobile contract e certificazione.

Ogni sottofase richiede autorizzazione separata. 5C non deve iniziare durante 5B e nessun backfill appartiene implicitamente a 5C–5E.

## 9. Criteri di accettazione e test applicabili

### 5A

- inventario schema/read-write/canonical-vs-legacy verificabile;
- assenza di modifiche runtime, schema, dati, RLS, grant, ownership e Applications;
- roadmap aggiornata con stato distinto di migration e Production;
- `git diff --check`;
- test foundation esistenti (`tests/unit/taxonomy-catalogs.test.ts`, `controlled-vocabulary.test.ts`);
- suite unit, lint, typecheck e build per provare che i soli documenti non introducano regressioni (build può dipendere dall'ambiente).

### Gate futuri

- contract tests su tuple sport/discipline/variant/role e fallback raw;
- PostgreSQL runtime per FK, uniqueness, RLS/grant e rollback;
- API compatibility snapshot per payload Web/Mobile legacy;
- regression Profile/experiences/Opportunity/Application/Search/suggestions/Maps;
- smoke manuale Preview per ogni modifica UI, con account Player, Staff, Club e Institution, lingue IT/EN/FR/ES e dataset legacy/canonical.

Per 5A **non è richiesto smoke manuale o screenshot**: non è stato modificato alcun comportamento o elemento visibile.

## 10. Stato finale e prossimo passaggio autorizzabile

- Database: repository auditato; nessuna migration creata/testata/applicata; stato remoto non verificato.
- API/Web: percorsi auditati; nessuna modifica.
- Mobile: **NOT STARTED / NON MODIFICATO**; questo audit non certifica parity Mobile.
- Blocker 5B: decisioni di dominio sopra elencate, soprattutto identity/cardinality e separazione category/competition/season.
- Prossimo passaggio autorizzabile: **FASE 5B, contratto canonico e regole di compatibilità**, repository-only e senza migration.
