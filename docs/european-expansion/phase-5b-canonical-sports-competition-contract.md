# FASE 5B — Contratto canonico Sports / Disciplines / Competitions

Data: 2026-09-04  
Dipendenza: FASE 5A completata e autorizzazione utente esplicita alla 5B.  
Stato: **IMPLEMENTATA E TESTATA — contratto documentale repository-only; nessun DDL, DML o runtime**.

## 1. Perimetro e non-obiettivi

La 5B traduce i risultati dell'audit 5A in un contratto logico, language-neutral e backward-compatible per guidare 5C–5J. Definisce identità, cardinalità, coerenza, localizzazione, alias, read/write precedence e forma additiva dei payload. Non crea ancora lo schema fisico.

Fuori scope:

- nessuna migration, tabella, colonna, constraint, policy, grant, trigger, funzione, view o RPC;
- nessun seed, catalogo europeo, backfill o modifica dati utente;
- nessuna modifica a API, server adapter, query, UI o filtri;
- nessuna query o write Preview/Production;
- nessuna modifica a ownership, RLS, Applications o visibilità Opportunity;
- nessuna implementazione Mobile. La replica Mobile fino alla FASE 4 resta **USER-REPORTED**; la parity FASE 5 resta **NOT STARTED / NON MODIFICATO**.

## 2. Principi bloccanti

1. **Identità separata dalla label.** UUID e code canonicali non dipendono dalla lingua; nomi e abbreviazioni localizzate sono presentation data.
2. **Additive-first.** Le stringhe legacy restano disponibili durante la transizione; nessun campo canonico è inizialmente obbligatorio sui record utente esistenti.
3. **Canonical-first, legacy-safe.** Read: canonical valido → mapping legacy univoco → raw legacy invariato. Un riferimento canonico rotto non deve essere mascherato silenziosamente.
4. **No guess/backfill.** Nessuna corrispondenza per somiglianza, traduzione, categoria omonima o default Italia; nessun aggiornamento automatico di dati storici.
5. **Catena coerente.** Sport, disciplina, variant, posizione, organizzazione, competizione, edizione e stagione devono appartenere agli scope dichiarati.
6. **Country-aware, non country-bound.** Organizzazioni e competizioni possono essere nazionali, subnazionali, sovranazionali o globali; `country_id` nullable non significa “sconosciuto” ma “non limitato a un solo Paese”, con membership/scope espliciti.
7. **Staff trasversale.** Un ruolo Staff ha identità globale; l'applicabilità a sport/discipline è una relazione opzionale, non parte della sua identità.
8. **Competition ≠ level ≠ group ≠ category.** Gli attuali testi non vengono riclassificati senza evidenza autoritativa.
9. **Season flessibile.** La chiave non è una label `YYYY/YY`; date e tipo di calendario sono espliciti.
10. **Old clients remain valid.** Nessun client è obbligato a inviare nuovi campi; campi legacy e semantics ownership/Application restano invariati.

## 3. Glossario canonico e modello logico

I nomi sotto sono contrattuali per il design; i nomi SQL definitivi saranno confermati in 5C.

### 3.1 Core taxonomy esistente

| Entità | Identità | Relazioni | Regole |
| --- | --- | --- | --- |
| `Sport` | UUID + `code` globale stabile | parent di Discipline | `code` lowercase ASCII/snake-case; mai tradotto o riutilizzato |
| `Discipline` | UUID + code unico nello Sport | FK Sport obbligatoria; parent di Variant | descrive una disciplina realmente distinta; niente disciplina “default” artificiale |
| `Variant` | UUID + code unico nella Discipline | FK Discipline obbligatoria | regole/formato di gioco; `team_size` è attributo opzionale, non identità |

Il contratto conserva le entità FASE 1 ma richiede integrità transitiva: ogni Variant determina una sola Discipline e ogni Discipline un solo Sport. Qualunque payload che fornisca più livelli deve corrispondere a tale catena.

### 3.2 Ruoli e posizioni

| Entità | Scope identitario | Relazioni |
| --- | --- | --- |
| `PlayerPosition` | posizione canonica globale con code stabile | una o più righe `PlayerPositionApplicability` verso Sport e, opzionalmente, Discipline/Variant |
| `StaffRole` | professione/funzione Staff globale | zero o più righe `StaffRoleApplicability`; zero righe significa trasversale |
| `PlayerPositionApplicability` | combinazione position + sport + discipline/variant nullable | variant richiede discipline; discipline richiede sport; catena validata |
| `StaffRoleApplicability` | combinazione staff role + sport + discipline/variant nullable | è metadata di pertinenza, non impedisce automaticamente un'esperienza storica legacy |

Decisioni:

- `role_group` Opportunity resta il discriminante legacy `player | staff` durante la transizione;
- `PlayerPosition` e `StaffRole` non condividono la stessa tabella, perché hanno cardinalità e semantiche diverse;
- alias come “Portiere” possono risolvere a posizioni differenti per sport solo attraverso mapping scoped; il testo da solo non basta;
- `profiles.role`, `athlete_experiences.role` e `club_staff_members.staff_role` restano fallback indipendenti finché le rispettive integrazioni non vengono autorizzate.

### 3.3 Organizzazioni sportive

`SportsOrganization` rappresenta federation, league, association, governing body o ente di promozione.

Campi logici minimi:

- UUID e `code` stabile scoped al provider/authority;
- `organization_type` controllato ed estensibile;
- parent organization nullable per gerarchie federali;
- `primary_country_id` nullable;
- membership country many-to-many per enti sovranazionali;
- provider, external/source identifier, validity dates, active flag e provenance metadata;
- names/abbreviations localizzati separati.

Una `Institution` applicativa può riferire in futuro una SportsOrganization, ma le due identità non vengono fuse automaticamente: verifica account, ownership e registry sono domini separati.

### 3.4 Competition family, edition, level e group

| Entità | Significato | Cardinalità chiave |
| --- | --- | --- |
| `Competition` | serie/identità stabile della competizione, non una singola stagione | organizer obbligatorio; Sport obbligatorio; Discipline/Variant opzionali coerenti |
| `CompetitionEdition` | manifestazione della Competition in una Season | Competition + Season; status/date opzionali; contiene gruppi |
| `CompetitionLevel` | livello/tier definito entro uno specifico sistema organizzativo e sportivo | organization + sport; country/scope e validità temporale opzionali |
| `CompetitionGroup` | girone/division/pool concreto entro una Edition | FK Edition; parent group opzionale soltanto nella stessa Edition |
| `CompetitionFormat` | round-robin, knockout, league/cup/hybrid ecc. | vocabolario controllato applicabile a Competition o Edition |
| `TerritorialScope` | global, continental, multi-country, national, regional/local ecc. | code controllato + relazioni esplicite a country/geo area quando richieste |

Regole:

- label omonime (`Serie A`, `A2`, `B`) non sono chiavi e possono coesistere per sport, organizer, Paese, genere o age class;
- Competition non incorpora la Season nel code stabile;
- Level può cambiare tra Edition senza cambiare identità della Competition;
- Group esiste soltanto dentro una Edition e non viene riutilizzato globalmente;
- una Competition multi-country usa scope/membership espliciti, non un country arbitrario;
- organizer e parent organization devono essere validi per l'intervallo temporale dell'Edition quando tali date sono disponibili.

### 3.5 Season

`Season` è un periodo canonico riutilizzabile, ma scoped almeno a organization o competition system per evitare di assumere calendari universali.

Campi logici minimi:

- UUID e code stabile nello scope;
- `start_date` e `end_date` (end >= start);
- `season_type`: `cross_year`, `calendar_year`, `split`, `tournament` o valore estensibile controllato;
- display label separata/localizzabile;
- parent season nullable per split/phase, vincolata allo stesso scope;
- active/status e provenance.

Le esperienze legacy `start_year/end_year` restano valide. Una label come `2025/26` non viene interpretata senza parser esplicito e scope; il `season_key` Fan Vote resta un contratto distinto finché una sottofase dedicata non ne dimostra l'equivalenza.

### 3.6 Gender e age class

- `GenderCategory` usa code stabili (`male`, `female`, `mixed`, più futuri valori approvati) e label localizzate. Non coincide con gender identity personale.
- Gli attuali valori Opportunity `uomo`, `donna`, `mixed` restano legacy e ricevono mapping espliciti.
- `AgeClass` è scoped a organization/sport e può avere `min_age`, `max_age`, cutoff rule/date, code e validity dates. `Giovanili` non è una AgeClass canonica sufficiente.
- `age_min/age_max` Opportunity restano requisiti numerici distinti; non vengono derivati automaticamente da AgeClass o viceversa.

### 3.7 Nomi, alias e provenance

Ogni entità catalogo che ha denominazioni deve supportare:

- nome ufficiale language-neutral quando realmente disponibile;
- tabella names con locale BCP-47, `name`, tipo (`official`, `short`, `display`) e flag preferred;
- alias separati con normalized value, locale/source, validity e target univoco;
- external identity composta da provider + source record ID;
- source version, URL/reference, license/attribution e import timestamp nei manifest/metadata appropriati;
- deactivation anziché riuso/cancellazione di code già pubblicati.

La normalizzazione serve alla lookup, non autorizza una conversione: un alias ambiguo nello scope produce `unknown/ambiguous`, mai una scelta arbitraria.

## 4. Cardinalità e invarianti

1. Discipline → esattamente uno Sport.
2. Variant → esattamente una Discipline; lo Sport è derivato, non indipendente.
3. Player position applicability → Sport obbligatorio; Discipline e Variant opzionali ma coerenti.
4. Staff role → globale; applicability opzionale e coerente.
5. SportsOrganization parent → aciclico; membership country distinta da primary country.
6. Competition → organizer e Sport obbligatori; Discipline/Variant coerenti; territorial scope obbligatorio nel modello futuro.
7. CompetitionEdition → Competition e Season obbligatorie; unicità scoped, non sulla label.
8. CompetitionGroup → una Edition; parent nella stessa Edition; ciclo vietato.
9. CompetitionLevel/AgeClass → scoped a organization+sport e validity-aware.
10. Canonical references disattivate restano leggibili per record storici ma non selezionabili per nuove write, salvo policy esplicita.
11. Nessuna FK canonica futura deve usare `ON DELETE CASCADE` verso profili, esperienze, Opportunities o Applications; catalog entries referenziate vengono deprecate, non eliminate.
12. Una write canonicale incoerente fallisce atomicamente; non degrada a legacy.

## 5. Contratto di compatibilità

### 5.1 Stati di risoluzione read

Ogni resolver espone uno stato esplicito:

- `canonical`: catena canonicale presente, coerente e leggibile;
- `legacy_mapped`: nessun riferimento canonico persistito, mapping legacy univoco;
- `legacy_raw`: valore storico non vuoto ma non mappabile;
- `ambiguous`: più target plausibili; nessuna scelta automatica;
- `empty`: nessun valore;
- `invalid_reference`: ID persistito mancante/incoerente; errore osservabile, non fallback silenzioso.

Priorità:

```text
canonical persisted references (validate full chain)
↓ only when canonical references are absent
unique scoped legacy mapping
↓
raw legacy value, unchanged
```

`invalid_reference` non scende automaticamente al testo legacy, perché nasconderebbe corruzione o drift di catalogo. Le superfici pubbliche possono mostrare il raw fallback per continuità, ma telemetry/debug devono mantenere lo stato invalido senza esporre dati sensibili.

### 5.2 Stati write field-aware

Un gruppo sport/competition usa una discriminated union:

- `absent`: nessuna chiave del gruppo nel payload; non modificare canonical né legacy;
- `legacy`: client storico invia i campi esistenti;
  - mapping univoco: dual-write canonical + legacy normalizzato compatibile;
  - unknown/ambiguous: preservare raw legacy e azzerare soltanto i riferimenti canonicali dello stesso gruppo per evitare uno stato stale; non toccare altri domini;
- `canonical`: client nuovo invia IDs/codes; validare tutta la catena e scrivere atomicamente canonical + proiezione legacy concordata;
- `reset`: segnale esplicito; azzerare canonical e legacy del solo gruppo;
- combinazione parziale o canonical/legacy conflittuale: HTTP 400 prima di write.

L'omissione non equivale mai a reset. Nessun default `Calcio`, Italia, role, gender, category, competition o season è applicato dal server.

### 5.3 Proiezione legacy

La proiezione da canonical a legacy:

- usa una label compatibility stabile e non la lingua UI;
- è versionata e testata contro i valori già accettati dai client;
- non traduce valori persistiti;
- può essere `null` quando il concetto non ha equivalente legacy, senza inventare una category;
- non sovrascrive automaticamente `category`/`required_category` con competition/level/age class;
- conserva raw legacy separatamente finché il rollout non certifica la rimozione (non prevista in FASE 5).

## 6. Contratto API additivo

I nomi finali saranno verificati contro le route in 5E/5G; il wire contract proposto è:

```ts
type CanonicalSportContext = {
  resolution: 'canonical' | 'legacy_mapped' | 'legacy_raw' | 'ambiguous' | 'empty' | 'invalid_reference';
  sportId: string | null;
  disciplineId: string | null;
  variantId: string | null;
  playerPositionId: string | null;
  staffRoleId: string | null;
};

type CanonicalCompetitionContext = {
  organizationId: string | null;
  competitionId: string | null;
  competitionEditionId: string | null;
  competitionLevelId: string | null;
  competitionGroupId: string | null;
  seasonId: string | null;
  ageClassId: string | null;
  genderCode: string | null;
  competitionFormatCode: string | null;
  territorialScopeCode: string | null;
};
```

Regole wire:

- gli attuali campi `sport`, `role`, `role_group`, `category`, `required_category`, `gender`, `age_min` e `age_max` restano presenti e con semantics compatibili;
- i context canonicali sono additivi e nullable;
- old request senza context segue il ramo `absent` o `legacy`, mai reset implicito;
- response include sia legacy sia canonical context durante la transizione;
- ID non validi, catene incoerenti e conflitti restituiscono 400; permission/RLS restano 401/403 secondo i contratti esistenti;
- unknown legacy non diventa 400 per i read storici;
- list/filter support canonical verrà aggiunto senza rimuovere query parameter legacy fino alla certificazione 5J;
- nessun endpoint espone catalog entries inattive come nuove opzioni, pur potendole risolvere in read storico.

Non è richiesta una capability negotiation per aggiungere campi JSON ignorabili; prima di rendere obbligatorio qualunque campo canonicale serviranno versione API o rollout coordinato e certificazione Mobile. La 5B vieta cambi obbligatori.

## 7. Contratti per dominio

### Profili ed esperienze

- profilo corrente resta single-primary-sport fino alla decisione autorizzata in 5F/FASE 6;
- esperienze possono riferire contesti sportivi e competitivi differenti per riga;
- Player position deve essere valida per il contesto della riga;
- Staff role può essere trasversale; applicability informa selector/validation ma non cancella legacy storico;
- Club multi-sport richiederà relazione dedicata, non array/CSV in `profiles.sport`;
- Institution/Fan non ricevono automaticamente campi sportivi personali.

### Opportunities e Applications

- Opportunity può avere sport obbligatorio secondo la regola prodotto esistente; nuovi canonical IDs iniziano nullable per compatibility;
- Player Opportunity usa `playerPositionId`; Staff Opportunity usa `staffRoleId`; `role_group` resta invariato;
- competition context è opzionale e non determina automaticamente visibility, eligibility o geografia;
- Applications continua a riferire Opportunity; non duplica il context e non cambia applicant/Club identity;
- nessun mismatch sport/competition impedisce candidature legacy finché 5G/5J non definiscono un gate esplicito e testato;
- `club_id`, `owner_id`, `created_by`, status, visibility, RLS e notifiche restano invariati.

### Search / Discover / WhoToFollow / Feed / Maps

- filtri canonicali sono exact-ID/scoped; legacy continua con adapter controllato;
- ranking può usare segnali sportivi solo in modo spiegabile e senza penalizzare record legacy/unknown;
- canonical discipline/position non deve essere simulata con `ilike` sulla label;
- Maps può filtrare organizzazioni per sport/competition, ma non cambia il boundary organization-only né crea pin personali;
- nessun filtro country viene dedotto dalla Competition senza territorial membership esplicita.

## 8. RLS, grant, ownership e privacy

5B non modifica security. Per 5C sono obbligatori questi gate:

- cataloghi pubblici: read soltanto delle righe pubblicabili; alias/provenance sensibili valutati separatamente;
- write catalogo: ruolo amministrativo canonico da riconciliare, senza assumere che `profiles.is_admin` sia l'unico segnale valido;
- tabelle user-linked: owner/admin semantics esistenti, con test anon/authenticated/service role;
- nessun `SECURITY DEFINER` senza search path fissato, least privilege e caso d'uso documentato;
- grant espliciti e auditati separatamente dalle policy RLS;
- ownership DB degli oggetti verificata nel runtime locale e poi, solo con autorizzazione, sull'ambiente remoto;
- nessuna informazione personale aggiuntiva resa pubblica tramite competition membership o staff qualification.

## 9. Strategia cataloghi e governance

5D dovrà usare manifest versionati e fonti ufficiali/autorevoli. Per ogni record: provider, source ID/version, license/attribution, publication/retrieval date, country/scope, validity e checksum/import report quando applicabile.

Ordine prudenziale:

1. consolidare gli sport FASE 1 e correggere soltanto gap provati;
2. discipline/variant con evidenza regolamentare;
3. vocabulary globale minima (gender category, format, territorial scope);
4. ruoli/posizioni con mapping scoped;
5. organizations;
6. competition/level/age class/season/edition/group per Paese e sport autorizzati.

Non è autorizzato inventare una matrice europea completa né copiare la piramide italiana. Seed e alias sono idempotenti; code pubblicati non vengono riutilizzati.

## 10. Decisioni chiuse e decisioni rinviate

### Chiuse in 5B

- identity UUID/code separata dalle label;
- modello Competition/Edition/Season/Group separato;
- PlayerPosition distinta da StaffRole con applicability;
- organization country-aware e capace di scope sovranazionale;
- canonical-first + mapping univoco + raw fallback;
- invalid canonical reference osservabile;
- write field-aware `absent/legacy/canonical/reset`;
- API additiva, legacy fields preservati;
- nessun backfill, traduzione persistita o default Italia/Calcio;
- Applications/ownership/RLS/Maps privacy invariati.

### Rinviate con gate

- nomi SQL, colonne e constraint fisici: 5C;
- lista/provider/coverage dei seed: 5D;
- implementazione resolver e proiezione legacy: 5E;
- strategia effettiva multi-sport Profile/Club: 5F e FASE 6;
- campi Opportunity obbligatori e filter behavior: 5G;
- pesi ranking: 5H;
- selector e copy: 5I;
- deprecation/rimozione legacy: non autorizzata; valutabile solo dopo 5J e Mobile parity separata.

## 11. Blueprint autorizzabile per 5C

5C può progettare e creare una migration **soltanto dopo autorizzazione separata**. Scope proposto:

- nuove tabelle catalogo/relazioni necessarie al modello 5B;
- completamento additivo dell'integrità transitiva della foundation esistente;
- columns canonicali nullable sui domini runtime soltanto se indispensabili al successivo dual-read/write e chiaramente separate per sotto-dominio;
- FK `ON DELETE RESTRICT/NO ACTION`, indici FK/filter, unique scoped e cycle guards dove applicabile;
- RLS/grant espliciti, senza cambiare policy di Profiles/Experiences/Opportunities/Applications;
- zero DML su dati utenti, zero seed (riservati a 5D), zero backfill;
- harness PostgreSQL locale con fixture legacy/canonical, invalid chain, RLS/grant/ownership, idempotenza, rollback e cleanup;
- migration non applicata a Preview/Production senza autorizzazione successiva esplicita.

Prima del DDL, 5C dovrà ridurre il blueprint a un minimum viable additive schema per evitare una migration monolitica; se necessario, proporrà 5C1/5C2 con gate distinti.

## 12. Criteri di accettazione 5B

- modello logico e glossario non ambiguo;
- cardinalità e integrità cross-entity definite;
- country/multi-country, season, gender, age class, Player position e Staff role trattati esplicitamente;
- identity/localization/alias/provenance separati;
- read/write compatibility e unknown/invalid semantics definite;
- wire contract additivo e impatto old Mobile documentato;
- ownership, Applications, visibility, RLS e privacy invarianti;
- nessun DDL/DML/runtime/remote/Mobile change;
- 5C delimitata ma non avviata.

## 13. Test e verifiche

Applicabili:

- audit di coerenza contro 5A e roadmap;
- ricerca statica per confermare assenza di nuovi file SQL e modifiche runtime;
- `git diff --check` **PASS**; `pnpm test:unit` **PASS (293/293)**; `pnpm lint` **PASS**; `pnpm typecheck` **PASS**; `pnpm build` **WARNING/BLOCKED** esclusivamente dal mancato fetch esterno di Inter e Righteous da Google Fonts, dopo l’avvio corretto della build.

Non applicabili: PostgreSQL runtime/migration tests, smoke API, Preview, Console/Network e screenshot, perché 5B è esclusivamente documentale e non modifica comportamento o UI. **Nessuna verifica manuale/visiva richiesta per 5B.**

## 14. Checkpoint operativo

| Voce | Stato |
| --- | --- |
| Fase/sottofase | FASE 5B |
| Stato | **IMPLEMENTATA E TESTATA / contratto documentale** |
| Codice modificato | no; soli documenti |
| Migration creata | no |
| Migration testata | non applicabile |
| Migration applicata | no |
| Production interrogata/modificata | no / no |
| RLS/grant/ownership modificati | no |
| Applications modificata | no |
| Impatto Web/API | contratto futuro; nessun comportamento/payload modificato |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Mobile fino a FASE 4 | **USER-REPORTED REPLICATED; non verificato qui** |
| Verifiche manuali | non applicabili |
| Blocker/rischi residui | schema minimo 5C, governance seed 5D, compatibilità old client da certificare in 5J |
| Prossimo passaggio autorizzabile | **5C — schema additivo e migration; non avviata** |

**Stop gate:** attendere autorizzazione esplicita prima di qualsiasi attività 5C.
