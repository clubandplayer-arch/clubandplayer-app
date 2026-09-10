# FASE 5D-D — Source registry per organizzazioni e competizioni

Data: 2026-09-07
Dipendenze: FASE 5D-C-R2 user-reported PASS; autorizzazione esplicita alla 5D-D.
Stato: **AUDIT IMPLEMENTATO E TESTATO — REVIEW UMANA DELLE FONTI PENDING; NESSUNA FONTE APPROVATA PER IMPORT**.

## 1. Perimetro

La 5D-D crea un registro repository-only delle fonti primarie candidate per organizzazioni e competizioni. La prima tranche di discovery è intenzionalmente limitata al football nei sei Paesi di lancio (IT, FR, ES, CH, SI, PL) e alla confederazione europea. Non importa record e non attribuisce automaticamente diritti di riuso a un sito perché è ufficiale.

Artefatti:

- `data/sports/phase-5d-d-source-registry.json`: registro versionato e revisionabile;
- `tests/unit/phase-5d-d-source-registry.test.ts`: gate fail-closed su Paesi, licenza, identity e denominazioni nazionali;
- questo documento e il roadmap master.

Fuori scope: manifest organization/competition importabile, download dataset, scraper, API integration, migration, DML, seed, schema, Preview/Production, 5D-E–5J e Mobile.

## 2. Metodo ed evidenze

Sono stati verificati repository, contratto 5D-B, schema 5C e regole 5D-C. L'accesso Internet del motore di ricerca integrato ha restituito HTTP 401; sono stati quindi eseguiti esclusivamente controlli HTTP diretti non autenticati sulle homepage ufficiali, senza scaricare dataset:

| Autorità candidata | Paese/scope | Evidenza diretta 2026-09-07 | Classificazione |
| --- | --- | --- | --- |
| FIGC | IT | HTTP 200, title `FIGC` | discovery only |
| FFF | FR | automazione HTTP 403 | verifica manuale richiesta |
| RFEF | ES | automazione HTTP 403 | verifica manuale richiesta |
| SFV/ASF | CH | automazione HTTP 403 | verifica manuale richiesta |
| NZS | SI | HTTP 200, title ufficiale verificato | discovery only |
| PZPN | PL | HTTP 200, title ufficiale verificato | discovery only |
| UEFA | Europa | automazione HTTP 503 | verifica manuale richiesta |

Una homepage ufficiale prova al massimo il candidato authority; **non prova** licenza, completezza, stabilità degli ID, versione del dataset o idoneità all'import.

## 3. Esito del registry

Il registry contiene sette authority candidate e copre i sei Paesi. Tutte sono `discovery_only`; nessuna è `approved_for_manifest`. Per tutte:

- `reuseStatus` è bloccante perché non sono state individuate condizioni esplicite di riuso;
- gli ID record stabili non sono dimostrati;
- coverage competizioni/stagioni non è auditata;
- non esiste checksum di un dataset sorgente;
- non viene proposta alcuna identity canonica da importare.

Di conseguenza **5D-E non può ancora creare un catalog tranche reale** a partire da questi URL.

## 4. Gate obbligatori per promuovere una fonte

Una fonte potrà passare da discovery a candidate/approved soltanto con un evidence pack per singolo organizer che documenti:

1. autorità primaria e scope regolamentare;
2. endpoint/file ufficiale preciso, non sola homepage;
3. stable source record identifier per ogni entità;
4. versione o effective/publication date;
5. termini espliciti di riuso e licenza, inclusi database rights;
6. attribuzione richiesta;
7. coverage ed esclusioni;
8. formato, schema e frequenza aggiornamento;
9. file sorgente e normalizzato con checksum;
10. politica di historical validity, rename, merger e disattivazione;
11. review manuale e approvazione registrata.

Robots/accessibilità tecnica non sostituiscono il diritto di riuso. Se uno dei gate manca, l'import resta bloccato.

## 5. Denominazioni nazionali

È formalizzata la decisione della review 5D-C-R2:

- nomi propri ufficiali di federazioni, competizioni, livelli e categorie restano nella lingua/nella forma nazionale della fonte;
- `Serie D`, `Eccellenza` e `Promozione` non diventano label tradotte;
- lo stesso varrà, a parti invertite, per denominazioni francesi, spagnole, svizzere, slovene e polacche;
- eventuali traduzioni descrittive future devono essere presentation metadata separati, mai identity o valore persistito sostitutivo;
- sigle ufficiali non sono espanse o normalizzate con fuzzy matching.

## 6. Coverage gap e rischi

- non-football non ancora inventariato;
- nessuna fonte competition/season/edition promossa;
- termini di riuso e database rights non verificati;
- possibile assenza di ID stabili nei siti pubblici;
- gerarchie e validità storica non conosciute;
- omonimie tra livelli/competizioni e Paesi;
- Svizzera multilingue: non scegliere arbitrariamente una traduzione come identity;
- federation website e governing authority possono non coincidere col titolare dei dati;
- scraping HTML fragile e non autorizzato;
- rischio di importare categorie italiane come modello universale;
- rischio Mobile/API se in futuro i nomi nazionali sostituissero stringhe legacy: proibito dalle fasi attuali.

## 7. Criteri di accettazione

- registry versionato e copertura dei sei Paesi: **PASS**;
- nessuna fonte promossa senza evidenza: **PASS**;
- gate licenza/ID/version/checksum fail-closed: **PASS**;
- policy denominazioni nazionali: **PASS**;
- nessuna migration/import/query remota: **PASS**;
- review umana authority/terms/endpoints: **PENDING**;
- fonte pronta per 5D-E: **NESSUNA / BLOCKED BY EVIDENCE**.

La 5D-D è quindi un audit implementato, non una certificazione delle fonti e non un'autorizzazione a importare.

## 8. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-D** |
| Stato | **AUDIT IMPLEMENTATO E TESTATO; REVIEW UMANA PENDING** |
| Codice modificato | registry JSON, unit test e documentazione |
| Migration creata | **NO** |
| Migration testata/applicata | **NON APPLICABILE / NO** |
| Seed/import/backfill | **NO / NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership | **NON MODIFICATI** |
| Applications | **NON MODIFICATA** |
| Impatto Web/API | **NESSUNO** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Verifica manuale | review fonti sì; UI/Console/Network no |
| Blocker | licenza, endpoint dataset, stable IDs, coverage, checksum |
| Prossimo passaggio autorizzabile | evidence pack ristretto per una fonte; 5D-E solo dopo review e nuova autorizzazione |

## 9. Verifica manuale richiesta

Non è richiesto smoke Web, Console, Network o Supabase. È richiesta una review documentale:

1. aprire il registry JSON;
2. aprire manualmente i sette `officialUrl` e confermare dominio/authority;
3. verificare che nessun record sia `approved_for_manifest`;
4. non interpretare pagine “competitions” come dataset riutilizzabili;
5. se si conoscono portali ufficiali/API/file e termini di riuso, fornire URL precisi per il successivo evidence pack;
6. confermare la policy sui nomi propri nazionali;
7. **non applicare** la migration 5D-C e non eseguire import.

Esito atteso: `PASS 5D-D DISCOVERY REGISTRY` oppure elenco delle authority/URL da correggere. La 5D-E non parte automaticamente.

## 10. Mobile

La repository Mobile non è stata aperta né modificata. Mobile parity FASE 5 resta **NOT STARTED / NON MODIFICATO**. Nessun contratto API/database consumato dal Mobile è cambiato.
