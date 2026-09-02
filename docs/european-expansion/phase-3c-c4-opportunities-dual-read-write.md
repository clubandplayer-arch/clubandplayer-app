# FASE 3C-C4 — Opportunities dual-read / dual-write

## Esito e perimetro

**PASS — dual-read/dual-write web/API implementato il 2026-08-31.** C4 collega le colonne canoniche introdotte da C3 ai boundary server e ai principali read path, senza integrare il selector in `OpportunityForm`, senza aggiungere filtri canonici e senza modificare mobile.

L'utente ha comunicato l'applicazione riuscita della migration C3 con risultato `Success. No rows returned`. Il target remoto non è stato interrogato indipendentemente da questo task; lo stato viene quindi registrato come **APPLICATA — USER-REPORTED SUCCESS**, mentre la certificazione Production indipendente resta non eseguita.

## Contratto dei comandi geography

`lib/opportunities/geography.ts` distingue esplicitamente:

- `absent`: nessun campo geografico nel PATCH, nessuna modifica;
- `legacy`: writer esistente con uno o più campi `country`/`region`/`province`/`city` e senza canonical IDs;
- `reset`: `country_id=null`, con `geo_area_id` null/assente;
- `country_only`: country UUID valido e area null/assente;
- `full`: country UUID e geo-area UUID validi.

Sono accettati alias snake_case e camelCase (`country_id`/`countryId`, `geo_area_id`/`geoAreaId`). UUID malformati, area senza country, country/area mismatch, country non supported/active, area assente/inattiva, chain incoerente/ciclica o area type non proiettabile producono errori deterministici e nessuna write.

## Dual-write atomico

Create e PATCH validano sempre lato server. Il client non è autorevole per label o ancestors.

Per un write canonico, il server:

1. carica una country supported+active;
2. carica area e ancestors attivi fino alla root, con limite di profondità e controllo country;
3. proietta i label legacy per `area_type`;
4. costruisce un singolo payload contenente canonical IDs e `country`/`region`/`province`/`city`;
5. esegue un solo `INSERT` o `UPDATE` sulla riga Opportunity.

La singola statement PostgreSQL rende atomica la modifica: non esiste una seconda tabella geography Opportunity da sincronizzare e non è necessaria una RPC.

Proiezione:

- root: `REGION`, `AUTONOMOUS_COMMUNITY`, `CANTON`, `STATISTICAL_REGION`, `VOIVODESHIP` → `region`;
- intermedio: `PROVINCE`, `DEPARTMENT`, `DISTRICT`, `POWIAT` → `province`;
- locale: `MUNICIPALITY`, `COMMUNE`, `GMINA` → `city`.

Country-only azzera area e bucket territoriali; reset azzera canonical e legacy geography. Un legacy PATCH esplicito azzera soltanto i due canonical IDs prima di salvare i label ricevuti, evitando che canonical data obsoleta nasconda una modifica effettuata da un client precedente. Un PATCH privo di qualsiasi campo geography non modifica né canonical né legacy.

## Dual-read canonical-first

Ogni response espone `country_id`, `geo_area_id` e un oggetto tipizzato `geography`:

- `source='canonical'`: country, area e ancestors canonici;
- `source='canonical_country'`: country-only;
- `source='legacy_text'`: nessun canonical ID, testo legacy presente;
- `source='none'`: nessuna geography.

Canonical e country-only prevalgono nella presentazione. Il testo legacy è conservato anche dentro `geography.legacy` per compatibility e diagnostica. Non viene effettuato mapping fuzzy dei label italiani.

Le collection caricano countries in batch e geo areas per livello in batch, evitando una query per Opportunity; la profondità massima è 16. Detail e read-after-write usano il resolver singolo.

## Read path integrati

- `GET /api/opportunities`;
- `POST /api/opportunities` read-after-write;
- `GET/PATCH /api/opportunities/:id`;
- pagina detail server;
- `OpportunitiesRepo.searchDB`;
- `getLatestOpenOpportunitiesByClub`;
- `/api/opportunities/mine`;
- `/api/applications/received` per il riepilogo Opportunity;
- Search Opportunities;
- feed highlights;
- `OpportunitiesTable`, `OpportunityCard` e widget Club.

I filtri continuano intenzionalmente a usare i parametri legacy: l'integrazione dei filtri canonici appartiene a C6. `OpportunityForm` continua intenzionalmente a usare il flusso legacy: il selector appartiene a C5.

## Ownership, RLS e Applications

C4 non modifica migration, RLS, policy, grant, trigger o funzioni. Restano invariati:

- `owner_id`, `created_by`, `club_id`, `club_name`;
- Club-only create e owner-only update/delete;
- `applications.athlete_id` compatibile Athlete/Player e Staff;
- `applications.club_id` user owner;
- self-application prevention, unique constraint, status e notifiche;
- nessun blocco cross-country.

La geography è attributo pubblico della Opportunity già pubblica; non viene letta o derivata la residence privata di Club/applicant.

## Test

`tests/unit/opportunity-geography-dual-read-write.test.ts` copre:

- matrice absent/legacy/reset/country-only/full;
- UUID e area senza country;
- proiezione gerarchie eterogenee;
- validazione server e payload atomico Slovenia;
- canonical display priority;
- integrazione collection/item e principali read surface;
- assenza di `CanonicalGeographySelector` da `OpportunityForm` in C4.

Sono inoltre eseguiti diff-check, lint, typecheck e suite unitaria completa: **191 PASS, 0 FAIL**. La build raggiunge la compilazione ottimizzata ma resta bloccata dal mancato download esterno dei font Google Inter/Righteous, come nei checkpoint precedenti. Nessuna write remota o fixture Production è stata creata.

## Stato operativo

| Voce | Stato |
| --- | --- |
| Codice C4 | IMPLEMENTATO web/API |
| Migration C3 repository | PRESENTE |
| Migration C3 testata localmente | PASS — PostgreSQL 16.15 |
| Migration C3 applicata | APPLICATA — USER-REPORTED SUCCESS (`Success. No rows returned`) |
| Production | TARGET/SCHEMA NON VERIFICATO INDIPENDENTEMENTE; nessuna query/write eseguita da C4 |
| Web | Dual-read/dual-write implementato; form non collegato |
| Mobile | NOT STARTED / NON MODIFICATO |
| RLS/grants/feature gate | NON MODIFICATI |
| Backfill | NON ESEGUITO |
| Verifica manuale/visiva C4 | NESSUNA VERIFICA MANUALE APPLICABILE |

## Blocker e prossimo passo

Non restano blocker repository C4. Una verifica mutativa remota richiederebbe account Club, fixture e cleanup e non è necessaria per chiudere questa sottofase repository-only; sarà applicabile dopo il collegamento controllato del form o nella regressione C7.

**Prossimo passaggio autorizzabile: C5 — integrazione `OpportunityForm`, soltanto previa autorizzazione esplicita. Fermarsi al termine di C4.**
