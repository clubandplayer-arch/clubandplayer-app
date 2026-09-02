# FASE 3C-C1 — Opportunities canonical geography audit

## Esito e perimetro

**Esito: PASS — audit repository-only completato il 2026-08-31.** Questo documento fotografa il contratto osservabile nel repository al commit di partenza `d40b96662e264c3d5a60d19631492fc8ec30dbed`. Non sono state eseguite query remote, migration, backfill, scritture Supabase, modifiche comportamentali, modifiche UI o modifiche mobile.

La roadmap documenta FASE 3C-B7 come completata nel perimetro web/API, con verifica manuale Preview ancora richiesta prima del merge. Il relativo deliverable conferma la copertura automatica di profili legacy Italia, Paesi canonici IT/FR/ES/CH/SI/PL, account type, canonical-first, fallback, signup senza default e boundary degli interessi; il repository mobile non è incluso ed è rimasto invariato. Questa evidenza soddisfa il preflight documentale richiesto per iniziare C1 senza reinterpretare B7 come rollout.

## 1. Limiti dell'evidenza

Il repository non contiene la migration originaria che crea `public.opportunities`. Lo schema seguente è quindi il **contratto ricostruito** da migration additive, select/payload applicativi e tipi TypeScript, non una certificazione dello schema remoto corrente. C2/C3 dovranno evitare di assumere che la history locale descriva integralmente Production.

Non è stata effettuata alcuna query remota, come richiesto. Di conseguenza restano da riconciliare, prima dell'applicazione di una futura migration, catalogo PostgreSQL effettivo, nullability/default, tipi esatti di tutte le colonne, policy effettivamente presenti, grants e trigger installati.

## 2. Schema Opportunities ricostruito

### Colonne osservabili

| Ambito | Colonne osservabili | Note |
| --- | --- | --- |
| Identità | `id` | Trattato come UUID/stringa; chiave usata da detail, applications e notification. |
| Contenuto | `title`, `description`, `status`, `created_at` | `status` usa almeno `open`, `closed`, `draft`, `archived`; alcuni read tollerano valori legacy ulteriori. |
| Ownership | `owner_id`, `created_by`, `club_id`, `club_name` | Tre identità non equivalenti: `owner_id`/`created_by` sono user UUID nei flussi correnti; `club_id` è profile UUID e ha FK additiva verso `profiles(id)`. |
| Geografia legacy | `country`, `region`, `province`, `city` | Campi testuali nullable; nessuna FK geografica Opportunity è presente nel repository. |
| Scouting | `sport`, `role`, `role_group`, `category`, `required_category`, `age_min`, `age_max`, `gender` | `role_group` è additivo con check `player|staff`; il codice normalizza null/ignoto a `player`. |

Il tipo applicativo espone inoltre alias di compatibilità (`createdAt`, `clubName`, `roleGroup`) e tratta sport, ruolo, status e country come superset string, segnale che dati legacy non normalizzati devono continuare a essere leggibili.

### Indici, vincoli e default osservabili

- `opportunities_club_id_idx` su `club_id` e FK `opportunities_club_id_fkey` verso `profiles(id) ON DELETE SET NULL`;
- indici owner e `created_at` introdotti da migration RLS storiche;
- indici trigram su `title`, `city` e `club_name`;
- check `role_group in ('player', 'staff')`, senza `NOT NULL` esplicito nella migration;
- nessun indice/FK/check canonico Opportunity-country/geo-area;
- nessun default geografico di database osservabile;
- default applicativo implicito a Italia nel form di creazione (si veda §7).

## 3. Trigger, funzioni, RLS e permessi

### Trigger/funzioni Opportunities

1. `set_owner_id_default()` / `trg_set_owner_id_default`: assegna `owner_id = auth.uid()` se null in insert.
2. `set_owner_from_auth()` / `trg_opportunities_set_owner`: secondo trigger storico con la stessa finalità.
3. `trg_opportunities_set_club_id()` / trigger omonimo: se `club_id` è null usa `coalesce(owner_id, created_by)`.

Il terzo trigger rivela un rischio di tipo/semantica: nei flussi correnti `owner_id` e `created_by` sono user UUID, mentre la FK additiva dichiara `club_id` come profile UUID. Il POST corrente passa esplicitamente il profile UUID e quindi evita normalmente il fallback; record o writer legacy possono invece dipendere da una coincidenza non garantita. C2–C7 non devono “correggere” incidentalmente questa ownership.

### RLS Opportunities

La history contiene policy con nomi differenti e quindi potenzialmente cumulative:

- policy storiche owner-only (`opps select/insert/update/delete own`);
- policy successive `opps_select_auth` per lettura di tutti gli autenticati e owner-only per insert/update/delete;
- `FORCE ROW LEVEL SECURITY` nella migration successiva.

Le policy PostgreSQL permissive applicabili alla stessa operazione si combinano con OR. Poiché le migration successive non eliminano tutti i nomi precedenti, il repository da solo non prova quale set sia oggi installato. Inoltre `GET /api/opportunities` è commentato come pubblico ma usa un client soggetto a RLS: la history visibile garantisce select ad `authenticated`, non esplicitamente ad `anon`. Questo disallineamento deve essere verificato in una futura fase autorizzata, senza cambiare RLS in C2/C3 salvo approvazione esplicita.

### Boundary applicativo

- POST richiede autenticazione e account `club`, risolto da metadata o `profiles.account_type`.
- PATCH/DELETE richiedono autenticazione e confrontano `owner_id ?? created_by` con `user.id`.
- Il POST scrive insieme `owner_id=user.id`, `created_by=user.id`, `club_id=profiles.id`.
- Il POST conserva un fallback per schema privo di `owner_id`; PATCH assegna `owner_id` al primo edit se entrambi i campi owner risultano null.
- Non emerge un percorso admin esplicito per le Opportunities nelle API analizzate.

**Invariante C2–C7:** nessuna colonna geografica, FK o helper deve modificare `owner_id`, `created_by`, `club_id`, i trigger ownership o le policy esistenti.

## 4. Percorsi di scrittura

### Create

`OpportunityForm` invia POST a `/api/opportunities`. Il server normalizza stringhe, sport, gender, role group e categorie, risolve il Club dal profilo autenticato e inserisce direttamente in `opportunities`. La scrittura geografica corrente comprende esclusivamente `country`, `region`, `province`, `city` testuali.

### Edit e delete

Lo stesso form invia PATCH a `/api/opportunities/:id`. Il server applica patch field-aware ai quattro campi testuali e verifica owner. DELETE verifica lo stesso owner e applica inoltre un filtro DB su `owner_id`/`created_by`.

### Writer indiretti

Non sono emersi altri insert/update Opportunity nei percorsi applicativi principali. Le migration storiche contengono backfill di `club_id`, `club_name`, normalizzazione sport e `role_group`, ma non geography canonicale. Le applications scrivono esclusivamente `applications` e non modificano la Opportunity.

### Rischi di write

- create e edit non condividono uno schema di validazione centralizzato;
- il POST converte `age_bracket`, mentre il form invia anche `age_min`/`age_max`; il PATCH usa direttamente gli estremi;
- il form salva il **label italiano** del Paese, non stabilmente l'ISO2;
- il PATCH consente testo geografico arbitrario/null;
- non esiste transazione dual-write canonico/legacy;
- un futuro write canonico non deve dipendere dalla sede Club né mutare applications.

## 5. Percorsi di lettura, repository, viste e query

### API e repository principali

- `GET /api/opportunities`: lista/paginazione, ricerca testuale e filtri legacy per country/region/province/city; arricchisce nomi Club da `profiles`.
- `GET /api/opportunities/:id`: detail API; risolve `club_profile_id` e nome tramite `clubs_view`/`profiles`.
- pagina server `/opportunities/:id`: query diretta Supabase e rendering della località testuale.
- `OpportunitiesRepo.searchDB`: query alternativa server-side con stessi campi e filtri legacy.
- `getLatestOpenOpportunitiesByClub`: widget profilo Club, filtra ownership e stato in memoria.
- `/api/opportunities/mine`: seleziona opportunità owner e relative applications.
- `/api/opportunities/filter`: legge tutte le righe e costruisce in memoria liste distinte dei valori testuali.
- `/api/opportunities/recommended`: delega al recommender; quest'ultimo è una dipendenza distinta da riesaminare quando la geografia verrà usata nel matching.

### Superfici di presentazione

`OpportunitiesTable`, `OpportunityCard`, detail, `ClubOpenOpportunitiesWidget`, Search e feed compongono la località con l'ordine `city, province, region, country`; l'abbreviazione provincia è specifica per l'Italia. Nessuna superficie risolve ancestors canonici.

### Search, feed e recommendation

- Search interroga Opportunities su `city`, `province`, `region`, `country` e filtra gli stessi campi testuali.
- Il feed highlights deriva preferenze geografiche da `profiles.interest_country || profiles.country` e `interest_city || city`, poi tenta matching Opportunity per uguaglianza testuale country/city con fallback progressivi. Ciò sovrappone ancora interest e location ed è legacy da preservare fino a una fase di prodotto dedicata, non un modello da copiare nel canonical schema.
- Link e “trending topics” codificano query string legacy.
- I filtri lista usano country code in URL ma l'API lo traduce nel label del catalogo statico prima del confronto DB.

### Rischi read/performance

- `/api/opportunities/filter` esegue una select non paginata e deduplica client/server-memory;
- ricerca `or(...ilike...)` interpola input senza il sanitizing usato dal repository alternativo;
- gli indici trigram coprono title/city/club_name, non country/region/province;
- coesistono API e repository con normalizzazioni/shape non identiche;
- l'arricchimento Club comporta query aggiuntive e identity fallback differenti;
- filtri canonicali per descendants richiederanno una strategia esplicita; una semplice equality su `geo_area_id` non include le aree figlie.

## 6. Applications e compatibilità applicant/Club

`applications` collega `opportunity_id` alla Opportunity, `athlete_id` all'**auth user** applicant e `club_id` all'**auth user** owner. Il nome `athlete_id` è legacy: l'API ammette oggi sia Athlete/Player sia Staff, escludendo Fan e Club. Non va rinominato o reinterpretato in C2–C7.

Il create Application:

- verifica account type Athlete/Player o Staff;
- legge `owner_id ?? created_by` dalla Opportunity;
- impedisce la candidatura alla propria Opportunity;
- imposta `athlete_id=user.id`, `club_id=owner user id`;
- impedisce duplicati per `(opportunity_id, athlete_id)`;
- mantiene fallback per ambienti applications privi di `club_id` e può usare un client admin dopo il controllo applicativo.

RLS applications permette select/update/delete a applicant o Club owner e insert all'applicant. Le API received/status/delete ripetono controlli su Opportunity owner. Un endpoint applications legacy autorizza invece solo tramite `created_by`, altro motivo per preservare entrambi gli alias ownership.

**Contratto da preservare:** canonical country/geo-area descrivono il luogo della Opportunity; non cambiano applicant identity, Club identity, eleggibilità cross-country, status, notifiche, unique constraint o ownership. Nessuna regola deve bloccare applicant esteri sulla base di residence/nationality/interests senza una decisione prodotto esplicita.

## 7. OpportunityForm e assunzioni implicite Italia

Il form inizializza il Paese a `IT` se `initial.country` non corrisponde esattamente a un label del catalogo statico. Questo include create nuove e può coinvolgere edit di record con ISO2 o label non riconosciuti. Per l'Italia usa `location_children()` con fallback diretto a `regions`, `provinces`, `municipalities`; per gli altri Paesi usa testo libero.

Assunzioni/limiti:

- gerarchia rigida `region → province → municipality` per IT;
- locale di ordinamento `it`;
- country persistito come label (es. `Italia`), pur se il tipo lo commenta come ISO2 “quando disponibile”;
- selezionando un Paese non-IT vengono azzerati region/province/city; successivamente region/province/city sono testo libero;
- il payload forza `province=null` fuori dall'Italia, nonostante l'input sia visibile;
- nessun ID legacy geografico è salvato sulla Opportunity;
- nessun dato viene precompilato dalla sede pubblica Club;
- sport default `Calcio` e role group fallback `player` sono assunzioni non geografiche da non alterare in questa fase.

Il catalogo statico dei Paesi non equivale a `countries supported/active` e include `OTHER`. C5 dovrà usare il selector canonico già validato in 3C-B senza imporre la gerarchia italiana agli altri Paesi.

## 8. Dipendenza da profili e sedi pubbliche Club

Le Opportunities dipendono dai profili Club per:

- autorizzare create (`profiles.account_type`);
- scrivere `club_id=profiles.id` e `club_name=profiles.full_name`;
- arricchire nome/avatar/link del Club;
- mostrare opportunità aperte sul profilo Club.

La località della Opportunity è però memorizzata autonomamente. I read non fanno fallback automatico alla sede Club per `country/region/province/city`; `clubs_view` nel detail API restituisce al più `club_city`, attualmente non usato come location Opportunity. La sede pubblica Club (`profiles` legacy e campi stadium/address/coordinates) e la geografia Opportunity hanno semantiche distinte: una trasferta, un evento o una posizione remota possono non coincidere con la sede.

**Decisione raccomandata:** nessun default o backfill automatico dalla sede Club. Un eventuale “usa sede Club” deve essere un'azione UI esplicita futura, con snapshot canonico scritto sulla Opportunity e senza legame dinamico.

## 9. Requisiti canonical country / canonical geo_area

### Contratto minimo raccomandato per C2

1. Aggiungere `country_id uuid null` con FK a `countries(id)`.
2. Aggiungere `geo_area_id uuid null` con FK a `geo_areas(id)`; il nome deve descrivere la location dell'Opportunity, non la residence del Club o applicant.
3. Garantire che, quando entrambi valorizzati, area e country coincidano tramite chiave/FK composita già compatibile con il modello canonico, non solo validazione client.
4. Consentire country-only e qualsiasi livello valido della gerarchia; non richiedere universalmente una municipality.
5. Mantenere `country`, `region`, `province`, `city` nullable e intatti per compatibility.
6. Non aggiungere default `IT`, non derivare da profilo/interessi/residence/nazionalità e non backfillare automaticamente in C2/C3.
7. Definire indici per `country_id`, `geo_area_id` e query descendants prima di C6.
8. Lasciare invariati ownership, RLS e applications; le FK geo devono usare un comportamento delete conservativo (`RESTRICT/NO ACTION`) coerente con l'immutabilità del catalogo, non cancellare Opportunities.

### Priorità di lettura

```text
Opportunity canonical country + geo area/ancestors
↓
Italy legacy textual mapping, se univoco e disponibile
↓
legacy country/region/province/city text
```

La compatibilità italiana differisce dai profili: Opportunities non possiede legacy geographic IDs, quindi l'eventuale mapping può partire soltanto da testo normalizzato e deve gestire ambiguità. Non si deve presentare un match euristico come dato canonico certo.

### Dual-write raccomandato

Un write canonico esplicito deve validare country/area lato server e scrivere atomicamente canonical IDs più proiezione testuale ancestors nei campi legacy. Country-only deve azzerare gli eventuali canonical/legacy descendants in modo controllato. Assenza dei campi geography in PATCH deve significare “non modificare”; reset esplicito deve essere distinto. Writer legacy privi di canonical IDs devono continuare a funzionare.

## 10. Comportamento da preservare

- tutte le Opportunity legacy, incluse righe con geography parziale/null, label Italia, ISO2 o testo estero;
- lista, detail, Search, feed, widget Club, create/edit/delete e filtri legacy;
- country-only e testo libero estero fino all'attivazione del selector canonico;
- ordine/fallback di display testuale quando canonical manca;
- `owner_id`, `created_by`, `club_id`, `club_name` e relativi fallback;
- Club-only create e owner-only mutation;
- application Athlete/Player e Staff, no self-application, unique/status/notifications/RLS;
- nessun vincolo cross-country implicito;
- nessuna modifica mobile e nessuna dipendenza obbligatoria da `profile_preferences` o sedi Club.

## 11. Rischi e decisioni residue

| Priorità | Tema | Decisione/verifica necessaria |
| --- | --- | --- |
| Bloccante C2 | Naming | Approvare `country_id` + `geo_area_id` oppure nomi espliciti `location_*`; raccomandati i nomi brevi per coerenza con Opportunities. |
| Bloccante C2/C3 | Schema reale | In una fase che autorizzi la verifica remota, confrontare tipi, constraint, grants, RLS, trigger e policy installati; il repository non contiene il create originario. |
| Bloccante C2 | Nullability | Raccomandati entrambi nullable per additive compatibility; country-only ammesso. |
| Bloccante C2 | Geo level | Approvare area a qualunque livello; raccomandato sì, perché le gerarchie europee hanno profondità variabile. |
| Bloccante C3/C4 | Atomicità | Scegliere RPC transazionale o enforcement DB + singolo statement; raccomandata una funzione/server contract atomica fail-closed, con grants non attivati implicitamente. |
| Bloccante C3/C4 | Legacy projection | Definire come proiettare gerarchie variabili nei campi `region/province/city`; raccomandato mapping per livello semantico, con label ancestors e null dove non esiste equivalente. |
| Prima C4 | Legacy mapping | Decidere se fare soltanto fallback read o un backfill separato, dry-run e review manuale; nessun backfill implicito. |
| Prima C5 | Default create | Rimuovere il default IT solo quando il selector canonico è collegato e testato; non sostituirlo con la sede Club. |
| Prima C6 | Descendants | Stabilire se il filtro area include descendants; raccomandato sì con contratto/query indicizzata e paginata. |
| Prima C6 | URL compatibility | Conservare parametri testuali legacy e aggiungere parametri ID non ambigui; definire precedenza canonical-first. |
| Prima C7 | RLS/public | Certificare anon/authenticated/owner effettivi; non modificare RLS incidentalmente. |
| Prodotto futuro | Remote/multi-location | Il modello C2 proposto rappresenta una singola location. Remote/hybrid o più sedi richiedono decisione separata, non una scorciatoia testuale. |

## 12. Piano raccomandato C2–C7

### C2 — canonical geography schema

Produrre un contratto SQL/documentale per colonne nullable, FK singole/composite, delete behavior, indici, livelli ammessi, canonical-first read e invarianti ownership/applications. Nessuna migration o comportamento.

### C3 — migration additive

Creare una sola migration idempotente/additiva, testarla in PostgreSQL locale con fixture sintetiche e verificare rollback transazionale. Nessuna applicazione remota, grant/feature gate o backfill senza autorizzazione separata.

### C4 — dual-read/dual-write

Introdurre resolver e payload/transaction contract condivisi. Read canonical-first con fallback legacy; write atomico, field-presence aware e server-validated. Mantenere i vecchi writer leggibili e fail closed se canonical è incoerente.

### C5 — OpportunityForm

Integrare `CanonicalGeographySelector` country-aware/hierarchy-aware per create/edit. Coprire reset, country-only, profondità variabile, edit legacy e proiezione testuale. Nessun auto-default da residence/interests/sede Club.

### C6 — filtri

Aggiungere country ID e geo-area ID/descendants preservando query string e filtri testuali legacy. Eliminare la full-table distinct scan oppure limitarla/paginarla; verificare indici e query plan localmente.

### C7 — regressione e backward compatibility

Certificare Opportunity legacy IT, nuova IT/FR/ES/CH/SI/PL, country-only, dati parziali/null, create/edit/detail/list/Search/feed/widget, ownership/RLS e applications Player/Staff cross-country. Web e mobile devono essere riportati separatamente; mobile resta non iniziato finché non autorizzato.

## 13. Matrice di certificazione C1

| Controllo | Esito |
| --- | --- |
| Schema/campi geography ricostruiti | PASS repository-only, con limite create originario documentato |
| Trigger/funzioni/RLS/permessi auditati | PASS repository-only, stato remoto non certificato |
| Ownership `owner_id`/`created_by`/`club_id` | PASS, invarianti e rischio identity documentati |
| API/read/write/repository/form/filtri/Search/feed | PASS |
| Applications applicant/Club compatibility | PASS |
| Legacy/default Italia/dipendenze Club | PASS |
| Requisiti e piano C2–C7 | PASS |
| Migration creata/testata/applicata | NON APPLICABILE — vietata in C1 |
| Production | NON MODIFICATA / NON INTERROGATA |
| Web | Audit completato; nessuna modifica comportamentale |
| Mobile | NOT STARTED / NON MODIFICATO |
| Verifica manuale C1 | NESSUNA VERIFICA MANUALE APPLICABILE |

**Prossimo passaggio autorizzabile: C2 — canonical geography schema. Non avviare C2 senza autorizzazione esplicita.**
