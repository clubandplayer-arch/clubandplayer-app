# FASE 5D-E-A — Source evidence readiness gate

Data: 2026-09-07
Dipendenze: FASE 5D-D discovery registry user-reported PASS; autorizzazione alla fase successiva.
Stato: **IMPLEMENTATA E TESTATA — CATALOG TRANCHE BLOCCATA PRIMA DEL MANIFEST PER EVIDENZE SORGENTE MANCANTI**.

## 1. Decisione di scope

La roadmap descrive 5D-E come catalog tranche country/organizer. Nessuna delle sette fonti discovery della 5D-D è però approvata per ingestion. Creare un manifest, una migration o un seed in questa condizione violerebbe i gate 5D-B/5D-D. La 5D-E viene quindi aperta prudentemente con la sottofase **5D-E-A**, un pre-import gate repository-only che stabilisce in modo eseguibile se una fonte possa alimentare un manifest locale.

Non è stato inventato alcun record FIGC/FFF/RFEF/SFV/NZS/PZPN/UEFA e non è stata scelta implicitamente l'Italia.

## 2. Codice

`lib/taxonomy/sportsSourceReadiness.ts` definisce nove evidenze obbligatorie:

1. primary authority;
2. URL preciso del dataset;
3. stable record identifier;
4. dataset version/effective date;
5. URL dei termini espliciti di riuso;
6. license identifier;
7. attribution;
8. coverage ed esclusioni;
9. checksum SHA-256 del retrieval.

Una fonte è `readyForLocalManifest` soltanto se:

- `status = approved_for_manifest`;
- `reuseStatus = approved_explicit_reuse_terms`;
- gli stable ID sono `evidenced`;
- tutte le evidenze sono valorizzate e non placeholder;
- URL dataset/licenza sono HTTPS;
- checksum è `sha256:<64 hex>`.

Il gate non esegue rete, non scarica dati, non produce SQL e non modifica il registry.

## 3. Esito sul registry reale

Il gate è stato eseguito in test sulle sette fonti 5D-D. Esito:

- fonti valutate: **7**;
- pronte per manifest locale: **0**;
- bloccate: **7**;
- blocker comuni: status discovery, riuso non approvato, stable ID non dimostrati, evidence pack assente.

Sono state inoltre interrogate in sola lettura le API pubbliche di discovery di `dati.gov.it`, `data.gouv.fr` e `opendata.swiss` con query mirate a football/federazioni/competizioni. Le prime due hanno restituito zero dataset pertinenti; i risultati svizzeri erano non pertinenti alle competizioni federali. Queste ricerche non costituiscono una fonte e nessun contenuto è stato importato.

## 4. Regole preservate

- niente conversione di pagine HTML in dataset implicito;
- niente scraping non autorizzato;
- niente identity derivata dalla sola label;
- nomi propri nazionali preservati;
- niente fuzzy matching;
- niente default Italia o football;
- niente traduzione persistita;
- niente dati utente, profili, esperienze, Opportunities o Applications;
- niente cambi API/Web/Mobile;
- niente `supabase db push`.

## 5. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-E-A** |
| Stato | **IMPLEMENTATA / TESTATA; CATALOG TRANCHE BLOCCATA DAL SOURCE GATE** |
| Codice modificato | source readiness gate, test e documentazione |
| Manifest organization/competition | **NON CREATO** |
| Migration creata | **NO** |
| Migration testata/applicata | **NON APPLICABILE / NO** |
| Seed/import/backfill | **NO / NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership | **NON MODIFICATI** |
| Applications | **NON MODIFICATA** |
| Impatto Web/API | **NESSUNO** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Verifiche manuali UI/Console/Network | **NON APPLICABILI** |
| Blocker | nessun evidence pack completo e approvato |
| Prossimo passaggio autorizzabile | **5D-E-B — evidence pack di una sola authority/country; consigliato partire da FIGC/IT, senza import** |

## 6. Verifica manuale richiesta

Nessuno smoke Web o Supabase. Per chiudere il gate è sufficiente:

1. confermare che è corretto non creare un seed senza licenza, dataset preciso e stable ID;
2. scegliere **una sola authority/country** per l'evidence pack successivo;
3. se disponibile, fornire URL del dataset/API/file e URL dei termini di riuso;
4. non applicare la migration 5D-C e non eseguire import.

Risposta proposta: `PASS 5D-E-A; autorizzo evidence pack FIGC/IT` oppure indicare una diversa authority. La 5D-E-B non parte automaticamente.

## 7. Mobile

La repository Mobile non è stata aperta né modificata. Mobile parity FASE 5 resta **NOT STARTED / NON MODIFICATO**.
