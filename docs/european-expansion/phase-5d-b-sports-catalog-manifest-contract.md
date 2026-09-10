# FASE 5D-B — Manifest contract e validator cataloghi sportivi

Data: 2026-09-07
Dipendenze: FASE 5D-A completata; autorizzazione utente a procedere se nessuno smoke manuale 5D-A fosse necessario.
Stato: **COMPLETATA — IMPLEMENTATA E TESTATA repository-only; nessun manifest dati o seed creato**.

## 1. Decisione sul gate 5D-A

La 5D-A non richiede una verifica manuale: era un audit documentale, senza UI, API, schema o dati. La condizione indicata dall'utente autorizza quindi l'avvio della sola 5D-B. Nessuna sottofase successiva viene avviata automaticamente.

## 2. Perimetro

La 5D-B introduce il contratto TypeScript e il validator fail-closed per i futuri manifest dei cataloghi 5C. Il codice è tooling repository-only: non è collegato all'applicazione, non interroga Supabase e non genera o applica SQL.

File implementati:

- `lib/taxonomy/sportsCatalogManifest.ts` — tipi, versioning, checksum deterministico e validator;
- `tests/unit/phase-5d-sports-catalog-manifest.test.ts` — manifest sintetico e casi negativi.

Fuori scope:

- contenuti reali dei cataloghi;
- scelta/adozione di fonti esterne;
- migration, seed SQL, importer o repository Supabase;
- dry-run contro uno schema/database reale;
- collegamento API/UI o dual-read/write;
- query/write Preview o Production;
- FASI 5D-C–5J e Mobile.

## 3. Contratto manifest

Ogni manifest dichiara:

- `schemaVersion`, attualmente fissato a `1`;
- `manifestVersion` datata e language-neutral;
- source provenance: provider, dataset version, publication date opzionale, retrieval date, URL HTTPS, licenza e attribuzione;
- Paesi ISO2 esplicitamente compresi;
- conteggi attesi per entity kind;
- checksum `sha256` del payload records normalizzato;
- records ordinati per dipendenza e identificati da una `key` stabile.

Le 19 entity kind corrispondono alle destinazioni 5C: controlled vocabularies, posizioni/ruoli, applicability, organizzazioni/countries, livelli, age class, season, competition/countries/geo areas, edition/group e mapping legacy.

Le relazioni usano chiavi simboliche come `sport:football` o `organization:<code>`. UUID di un ambiente non fanno parte del contratto. Le dipendenze già esistenti nella foundation vengono fornite al validator come `knownReferences`; le altre devono apparire prima del record che le usa.

## 4. Checksum deterministico

`calculateSportsCatalogPayloadChecksum()`:

1. ordina ricorsivamente le chiavi degli oggetti;
2. conserva l'ordine intenzionale degli array/record;
3. serializza in JSON;
4. calcola SHA-256 UTF-8 e restituisce `sha256:<hex>`.

Il checksum protegge il payload dati, non sostituisce la revisione della fonte o della licenza. Una modifica dei record senza aggiornamento del checksum blocca la validazione.

## 5. Validazioni fail-closed

Il validator rifiuta:

- schema o manifest version non supportati;
- provenance obbligatoria vuota o placeholder (`CONFIRM_REQUIRED`, `TODO`, `TBD`, `UNKNOWN`, `N/A`);
- URL fonte non HTTPS e date non valide;
- ISO2 malformati, duplicati o record riferiti a Paesi non dichiarati;
- entity kind non supportate;
- key duplicate;
- code non language-neutral o incompatibili con i constraint 5C;
- collisioni di code per controlled vocabulary/position/role;
- collisioni `provider + sourceRecordId` per organization/competition;
- reference obbligatorie assenti;
- reference mancanti, forward o non presenti nella foundation allowlist;
- record fuori ordine di dipendenza;
- conteggi diversi dal manifest;
- checksum malformato o non corrispondente.

Il validator non esegue fuzzy matching, non traduce valori e non converte categorie italiane in competition/level. Un dato ambiguo resta escluso dal manifest finché non è stata presa una decisione verificabile.

## 6. Test e fixture sintetica

La fixture inline dei test rappresenta esclusivamente dati sintetici (`example.invalid`, `INTERNAL_TEST_FIXTURE`) e non è un seed candidato. Copre una catena controllata:

```text
gender/scope + position/staff role
→ applicability
→ organization/country
→ season
→ competition
→ edition
→ legacy position mapping
```

I casi negativi verificano checksum drift, placeholder di licenza, Paese non dichiarato, identity duplicate, reference mancanti, conteggi errati e UUID ambientali non risolti.

## 7. Contratti preservati

- nessun valore persistito viene tradotto;
- nessun dato utente viene letto o modificato;
- nessun default Italia/Calcio;
- nessuna deduzione da `CATEGORIES_BY_SPORT`;
- ownership e visibility Opportunity invariate;
- Applications invariate;
- RLS/grant/ownership database invariati;
- payload API e client Mobile invariati;
- `supabase db push` resta vietato a causa della history generale incompleta.

## 8. Criteri di accettazione

- contratto versionato per tutte le entity kind 5C: **PASS**;
- provenance e licenza fail-closed: **PASS**;
- checksum deterministico e drift detection: **PASS**;
- collisioni e conteggi: **PASS**;
- dipendenze simboliche senza UUID ambientali: **PASS**;
- fixture positiva e casi negativi: **PASS**;
- nessun seed/migration/import remoto: **PASS**.

## 9. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-B** |
| Stato | **COMPLETATA — IMPLEMENTATA E TESTATA repository-only** |
| Codice modificato | **SÌ — contract/validator e unit test** |
| API/UI/runtime modificati | **NO** |
| Manifest contenente dati reali | **NON CREATO** |
| Migration creata/testata/applicata | **NO / NON APPLICABILE / NO** |
| Seed/backfill | **NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership modificati | **NO / NO / NO** |
| Applications modificata | **NO** |
| Impatto Web/API | **NESSUN IMPATTO RUNTIME** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Verifiche manuali | **NON APPLICABILI** |
| Rischi residui | contenuti, code semantici, fonti/licenze e importer non ancora approvati |
| Prossimo passaggio autorizzabile | **5D-C — controlled vocabulary e compatibility tranche** |

## 10. Verifiche manuali richieste

Nessuna verifica UI, Preview, Console, Network o Supabase è richiesta per la 5D-B: il validator è isolato e coperto da test automatici; non esistono cambiamenti percepibili o remoti.

Per procedere è richiesta soltanto una nuova autorizzazione esplicita alla **5D-C**. In 5D-C dovrà essere presentato per revisione umana l'elenco completo dei code/label/mapping proposti **prima** di autorizzare qualsiasi apply Supabase. Se verrà creata una migration o un seed, verranno indicati esplicitamente file, hash, ambiente, stato applicato/non applicato e controlli post-apply.

## 11. Mobile

La repository Mobile non è stata aperta né modificata. Mobile parity FASE 5 resta **NOT STARTED / NON MODIFICATO**.
