# FASE 5D-E-B — Evidence pack FIGC / Italia

Data: 2026-09-07
Dipendenze: FASE 5D-E-A PASS e autorizzazione esplicita all'evidence pack FIGC/IT.
Stato: **AUDIT IMPLEMENTATO E TESTATO — FIGC/IT BLOCKED, NON READY FOR LOCAL MANIFEST**.

## 1. Perimetro

La sottofase verifica se le fonti ufficiali FIGC oggi accessibili soddisfino i nove gate 5D-E-A per creare una prima tranche locale di organizzazioni/competizioni. Il lavoro è read-only e repository-only: non effettua scraping massivo, non conserva pagine o contenuti FIGC, non crea record canonici e non avvia alcun import.

Artefatto strutturato: `data/sports/evidence/phase-5d-e-b-figc-it-evidence-pack.json`.

## 2. Fonti primarie verificate

Il 7 settembre 2026 sono state recuperate direttamente via HTTPS, con HTTP 200:

- homepage ufficiale FIGC;
- pagina ufficiale `Campionati Nazionali`;
- sitemap ufficiale FIGC;
- `Condizioni di utilizzo del servizio`.

Per ogni risposta il pack registra URL, classificazione e SHA-256 del retrieval, senza includere una copia del contenuto protetto.

La pagina Campionati Nazionali conferma una superficie informativa ufficiale, ma non espone nel perimetro verificato un file/API catalogo con schema, versioning, coverage e stable record ID. La sitemap è un indice di pagine web, non un dataset competition.

## 3. Valutazione dei termini di riuso

Le condizioni ufficiali identificano sito e contenuti come protetti e con diritti riservati, salvo diversa indicazione espressa. Nell'evidence pack non è stata individuata una licenza open-data né una concessione esplicita per il riuso di un database/catalogo di organizzazioni e competizioni.

Decisione prudenziale:

- l'accesso pubblico non equivale a permesso di ripubblicazione/import;
- la sitemap non viene usata come feed di catalogo;
- `ALL_RIGHTS_RESERVED_SITE_TERMS` descrive il gate rilevato, non una licenza di ingestion;
- serve una fonte separata con riuso esplicito o autorizzazione scritta FIGC.

## 4. Stable identity e coverage

Non risultano dimostrati:

- source record ID ufficiali e stabili per competition/level/season;
- versione o effective date del dataset;
- copertura ed esclusioni;
- politica rename/merge/disattivazione;
- schema machine-readable;
- update frequency.

Gli identificatori tecnici delle pagine CMS e gli URL non vengono promossi a identity sportiva.

## 5. Esito del readiness gate

| Gate | Esito |
| --- | --- |
| Primary authority | **EVIDENCED** |
| Official scope page | **EVIDENCED, HUMAN-READABLE ONLY** |
| Dataset/API URL | **MISSING** |
| Stable record identifiers | **MISSING** |
| Version/effective date | **MISSING** |
| Explicit catalog/database reuse grant | **MISSING / BLOCKING** |
| Attribution | **EVIDENCED** |
| Coverage/exclusions | **MISSING** |
| Retrieval checksum | **EVIDENCED PER PAGE** |
| Ready for local manifest | **NO** |

Classificazione finale: `BLOCKED_NOT_READY_FOR_LOCAL_MANIFEST`.

## 6. Implicazioni

Non vengono creati:

- manifest organization/competition;
- record FIGC, competition, level, season o edition;
- migration o seed;
- importer o scraper;
- mapping da categorie italiane;
- modifiche API/UI.

Un nome pubblico e fattuale non autorizza a copiare sistematicamente struttura e contenuti del catalogo del sito. Un'eventuale micro-tranche curata internamente richiederebbe comunque una decisione prodotto/legale distinta e una provenance compatibile col contratto 5D-B.

## 7. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-E-B** |
| Stato | **AUDIT IMPLEMENTATO / TESTATO; FIGC SOURCE BLOCKED** |
| Codice modificato | evidence JSON, test e documentazione |
| Manifest catalogo | **NON CREATO** |
| Migration creata | **NO** |
| Migration testata/applicata | **NON APPLICABILE / NO** |
| Seed/import/backfill | **NO / NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| Siti FIGC interrogati | **SÌ, GET pubbliche read-only** |
| RLS/grant/ownership | **NON MODIFICATI** |
| Applications | **NON MODIFICATA** |
| Impatto Web/API | **NESSUNO** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Blocker | licenza database, dataset/API, stable ID, versione, coverage |
| Prossimo passaggio autorizzabile | ottenere fonte/licenza FIGC idonea oppure scegliere una diversa authority per evidence pack; nessun import |

## 8. Verifica manuale richiesta

Nessuno smoke Preview, Console, Network applicativo o Supabase. La review umana consiste nel:

1. aprire i quattro URL riportati nel JSON;
2. confermare che `Campionati Nazionali` è una pagina informativa, non un download/API catalogo;
3. controllare le condizioni di utilizzo e confermare che non espongono una licenza open-data per il catalogo;
4. confermare che il pack non contiene record competition e che `mayCreateSeedOrMigration` è `false`;
5. non applicare migration e non importare dati.

Se disponi di autorizzazione scritta, API partner o dataset ufficiale con termini diversi, non inserirne credenziali: comunica soltanto URL e natura dell'accesso per un audit separato.

Esito proposto: `PASS 5D-E-B FIGC BLOCKED` e scelta tra:

- continuare FIGC solo dopo nuova evidenza/licenza;
- autorizzare un evidence pack per un'altra authority;
- sospendere cataloghi reali e procedere soltanto quando una fonte idonea sarà disponibile.

## 9. Mobile

La repository Mobile non è stata aperta né modificata. Mobile parity FASE 5 resta **NOT STARTED / NON MODIFICATO**.
