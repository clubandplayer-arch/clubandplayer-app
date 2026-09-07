# FASE 5D-A — Audit cataloghi e seed controllati

Data: 2026-09-07
Dipendenze: FASI 5A–5C completate; migration 5C applicata e registrata in Production; autorizzazione utente esplicita alla FASE 5D.
Stato: **COMPLETATA — AUDIT repository-only; nessun catalogo, seed o comportamento runtime modificato**.

## 1. Perimetro

Questa attività apre la FASE 5D con un audit prudenziale delle fonti disponibili, dei cataloghi applicativi e del modello fisico 5C. L'obiettivo è stabilire **che cosa può essere trasformato in un manifest controllato**, con quali prove e in quale ordine, prima di creare DML o importare dati.

Sono stati esaminati:

- foundation canonica Sport → Discipline → Variant;
- 19 tabelle introdotte dalla 5C e le loro dipendenze;
- liste applicative di posizioni Player, ruoli Staff e categorie;
- controlled vocabulary di presentazione;
- pattern già adottati per manifest, provenance, dry-run e import geografici;
- rischi di trasformare liste italiane o label localizzate in identità canoniche.

Fuori scope:

- nessuna migration o seed SQL;
- nessun download o adozione di dataset esterni;
- nessuna query o write Preview/Production;
- nessun backfill o mapping dei dati utente;
- nessuna modifica a schema, RLS, grant, ownership, Applications, API o UI;
- nessun avvio di 5E–5J;
- nessuna modifica Mobile.

## 2. Evidenze repository

| Evidenza | Risultato |
| --- | --- |
| `lib/taxonomy/catalog.ts:58-108` | 13 Sport, due Discipline e due Variant sono dichiarati in TypeScript; Discipline/Variant coprono soltanto football/futsal. |
| `supabase/migrations/20260822120000_european_catalog_foundation.sql:198-306` | Sport, Discipline, Variant e alias sport legacy sono già seedati dalla FASE 1 con upsert. Non devono essere duplicati nella 5D. |
| `lib/opps/constants.ts:5-65` | Le posizioni sono stringhe per 14 sport; i 27 ruoli Staff sono una lista globale; le label sono prevalentemente italiane e `Pallavolo → Volley` è un alias applicativo. |
| `lib/opps/categories.ts:9-106` | Le categorie mescolano livelli, competizioni, enti, età e fallback (`Altro`) e incorporano una tassonomia italiana; non sono un catalogo canonico importabile. |
| `supabase/migrations/20261206120000_canonical_sports_competition_schema.sql:12-344` | La 5C offre le destinazioni vuote per posizioni/ruoli, applicability, organizzazioni, controlled catalog, livelli, classi, stagioni, competizioni, edizioni, gruppi e mapping legacy. |
| `lib/i18n/controlledVocabulary.ts:72-77` | Le funzioni localizzano valori soltanto in presentazione; le traduzioni non sono fonti di identity, alias o seed. |
| `lib/geo/import/productionConfig.ts:8-23` | Il pipeline geografico dimostra un pattern utile: provider, dataset version, data di pubblicazione, licenza, attribuzione, source identifier e conteggi attesi. |
| `lib/geo/import/productionImport.ts:33-85` | L'import Production geografico è fail-closed su licenza/versione, preceduto da dry-run e batch report. La 5D deve adottare garanzie equivalenti. |

## 3. Stato reale dei cataloghi

### 3.1 Foundation riutilizzabile

`sports`, `sport_disciplines`, `sport_variants` e `legacy_sport_mappings` costituiscono la sola foundation già popolata. La 5D deve referenziarla tramite code stabili e risolvere gli UUID nell'ambiente target; non deve incorporare UUID generati in un altro database.

La copertura è asimmetrica:

- gli Sport applicativi principali hanno identity canonica;
- football contiene `association_football` e `futsal`;
- association football contiene `eleven_a_side` ed `eight_a_side`;
- gli altri sport non hanno Discipline o Variant artificiali, coerentemente con il contratto 5B.

### 3.2 Candidati controllati, ma non ancora approvati come dati

| Dominio | Materiale presente | Classificazione audit |
| --- | --- | --- |
| Player positions | `SPORTS_ROLES` | **Candidate input**, da convertire in code language-neutral e applicability esplicita; collisioni come `Portiere`, `Ala`, `Centro` richiedono identity/scope distinti o una decisione semantica. |
| Staff roles | `STAFF_ROLES` | **Candidate input**, potenzialmente globale; serve definire code e distinguere professione, carica societaria e funzione tecnica. |
| Gender categories | valori legacy Opportunity/UI | **Small governed vocabulary**; non coincide con gender identity personale e richiede mapping espliciti. |
| Competition formats | nessuna lista completa verificata | **Missing manifest**; non dedurre dai nomi delle competizioni. |
| Territorial scopes | regole 5B/colonne 5C | **Small governed vocabulary**; i flag `requires_country`, `allows_multiple_countries`, `allows_geo_area` devono essere definiti e testati insieme. |
| Legacy position/role mappings | stringhe applicative | **Candidate compatibility mapping**; normalizzazione deterministica, scope obbligatorio per Player, nessun fuzzy match. |

Questi cataloghi possono essere governati internamente soltanto dopo una revisione semantica esplicita. La presenza di una stringa nel codice non prova universalità, correttezza internazionale o diritto di attribuirle una identity condivisa.

### 3.3 Cataloghi autoritativi mancanti

Non esiste nel repository una fonte verificata e versionata per:

- federazioni, leghe, associazioni e relative gerarchie;
- competizioni dei sei Paesi e competizioni sovranazionali;
- livelli/piramidi country- e season-aware;
- classi d'età e cutoff rule per organizzazione;
- stagioni e calendari;
- edizioni e gruppi territoriali.

Questi domini **non possono essere seedati da** `CATEGORIES_BY_SPORT`: quella lista unisce concetti differenti e contiene valori italiani (`Serie D`, `Eccellenza`, `Prima Categoria`, enti di promozione, `Giovanili`, `Altro`). Anche label omonime come `Serie A`, `A2` o `B` non identificano una Competition o un Level senza organizer, sport, Paese e validità temporale.

## 4. Matrice source-of-truth

| Target 5C | Identity proposta | Fonte minima accettabile | Strategia 5D |
| --- | --- | --- | --- |
| `player_positions` | code globale + applicability | manifest interno revisionato per sport/regolamento | tranche controllata, prima senza collegamento runtime |
| `staff_roles` | code globale | manifest interno revisionato | tranche controllata; zero applicability significa trasversale |
| applicability | target code + sport/discipline/variant code | manifest interno con test catena | risoluzione FK per code, mai UUID hardcoded |
| `gender_categories` | code | decisione prodotto documentata | seed piccolo e completo |
| `competition_formats` | code | decisione semantica + riferimenti regolamentari | rinviare finché l'elenco non è approvato |
| `territorial_scopes` | code + tre capability flag | contratto 5B/decisione prodotto | seed piccolo con matrice invarianti |
| `sports_organizations` | provider + source record id | registry ufficiale o fonte primaria | import per provider/Paese con provenance |
| `competition_levels` | organizer + sport + country + code | fonte primaria, periodo di validità | import validity-aware |
| `age_classes` | organizer + sport + code | regolamento ufficiale con cutoff | import validity-aware, niente derivazione da `Giovanili` |
| `seasons` | organizer + code | calendario/regolamento ufficiale | date esplicite; niente parsing implicito di label |
| `competitions` | provider + source record id | fonte primaria dell'organizer | import dopo organization/scope/controlled vocab |
| editions/groups | parent canonicali + code scoped | fonte ufficiale della stagione | ultima tranche, mai dedotta dal testo utente |
| legacy mappings | normalized raw + scope | inventario codice/dati + review univocità | mapping esplicito; ambiguous resta non mappato |

## 5. Contratto minimo del manifest

Ogni futuro manifest deve essere versionato nel repository e contenere almeno:

- `manifestVersion` e schema version;
- provider e source record identifier stabili;
- dataset/source version, publication/effective date e retrieved date;
- riferimento alla fonte primaria;
- license identifier, attribution e condizioni di riuso confermate;
- Paese/i e scope;
- code language-neutral, canonical name e stato active;
- validità temporale ove applicabile;
- relazioni espresse per code/provider, non UUID ambientali;
- conteggi attesi per entity type;
- checksum del file sorgente/normalizzato;
- decision log per record esclusi, ambigui o disattivati.

Placeholder come `CONFIRM_REQUIRED`, licenza vuota, provider generico o source ID derivato dalla sola label devono bloccare dry-run/apply.

## 6. Ordine di dipendenza per un futuro seed

1. validare la foundation FASE 1 già esistente;
2. controlled vocabulary senza FK (`gender_categories`, `competition_formats`, `territorial_scopes`);
3. Player positions e Staff roles;
4. applicability verso Sport/Discipline/Variant;
5. organizations, parent e countries;
6. levels e age classes;
7. seasons e parent season;
8. competitions e scope country/geo;
9. editions;
10. groups;
11. legacy mappings deterministici.

L'ordine non autorizza un unico seed monolitico. Ogni tranche deve avere dry-run, diff, conteggi, idempotenza, rollback operativo e autorizzazione remota separata.

## 7. Regole di import e aggiornamento

- **Insert/update scoped:** il conflitto deve usare la natural key prevista dallo schema; mai match sulla label.
- **No deletion:** un record pubblicato viene disattivato o chiuso con `valid_to`; non viene eliminato durante gli aggiornamenti ordinari.
- **No overwrite non verificato:** cambio organizer, sport o source identity è un conflitto bloccante, non un update automatico.
- **Idempotenza:** secondo dry-run/apply deve produrre zero insert/update inattesi.
- **Fail closed:** dipendenza mancante, source duplicata, code collision, catena incoerente, licenza non confermata o conteggio fuori soglia impediscono l'apply.
- **Zero user mutation:** 5D popola soltanto cataloghi; profili, esperienze e Opportunities restano invariati fino alle sottofasi dedicate.
- **No translated persistence:** label UI non vengono persistite al posto di code/canonical name.
- **Environment safety:** data la history incompleta, `supabase db push` resta vietato; un eventuale apply Production dovrà essere esclusivo, verificato e autorizzato separatamente.

## 8. Gap e decisioni necessarie

1. Approvare un formato manifest unico e validator fail-closed.
2. Decidere il primo perimetro: raccomandato **controlled vocab + posizioni/ruoli**, non competizioni.
3. Revisionare code e identità delle posizioni omonime tra sport.
4. Classificare i ruoli Staff in globali, sport-applicable e cariche organizzative senza perdere compatibility.
5. Definire i code minimi di gender, format e territorial scope; format può essere rinviato se non ancora supportato da fonti.
6. Identificare fonti primarie e licenze per ciascun Paese/organizer prima di organizations/competitions.
7. Stabilire la politica temporale per level, age class, season ed edition.
8. Decidere se il modello 5C necessita in una futura fase additiva di tabelle names/aliases o metadata provenance più strutturati: le tabelle attuali non materializzano tutte le names localizzate descritte in 5B.
9. Non convertire automaticamente `CATEGORIES_BY_SPORT`; serve una matrice di classificazione `legacy category → unknown/level/competition/age class/organization label` con ambiguità esplicite.

## 9. Rischi

- mismatch posizione–sport causato da code globali troppo generici;
- falsa universalità dei ruoli Staff o sovrapposizione tra job e carica societaria;
- import di categorie valide soltanto per il calcio italiano;
- collisioni tra label omonime di competizioni/livelli;
- season cross-year, calendar-year e split interpretate con un parser unico;
- discipline/variant associate allo Sport sbagliato;
- alias storici non riconosciuti o mappati in modo ambiguo;
- drift tra TypeScript, manifest, DB e traduzioni;
- provenance/licensing insufficiente per fonti sportive;
- rottura dei client Mobile pubblicati se le stringhe legacy venissero mutate o rese obbligatorie;
- uso accidentale di `db push` sulla migration history incompleta;
- dati legacy italiani alterati prima del dual-read/write 5E–5G.

## 10. Proposta di sottofasi 5D

- **5D-A — audit fonti/cataloghi/seed:** questa attività, completata repository-only.
- **5D-B — manifest contract e validator:** tipi/schema, fixture sintetiche, checksum, provenance, collision detection e dry-run; nessun dato Production.
- **5D-C — controlled vocabulary e compatibility tranche:** manifest revisionato per gender/scope, posizioni, ruoli, applicability e mapping legacy; runtime locale, nessun apply remoto implicito.
- **5D-D — source registry per organizations/competitions:** inventario fonti primarie, licensing e coverage per IT/FR/ES/CH/SI/PL; nessun seed finché i gate non sono completi.
- **5D-E — catalog tranche country/organizer:** import locale di organization/level/age/season/competition per tranche autorizzate, con report e idempotenza.
- **5D-F — Preview/Production rollout:** preflight e apply esclusivi, uno per tranche, soltanto con autorizzazioni mutative separate e verifiche post-apply.

La suddivisione 5E–5J della roadmap resta invariata. Nessun adapter o collegamento runtime appartiene alla 5D.

## 11. Criteri di accettazione 5D-A

- inventario delle fonti repository e delle destinazioni 5C;
- separazione tra candidate interno e fonte autoritativa;
- divieto esplicito di trasformare categorie italiane in identity europee;
- contratto minimo di provenance e ordine di dipendenza;
- strategia fail-closed, idempotente e senza UUID ambientali;
- rischi Mobile/legacy/Production documentati;
- nessuna migration, DML, query remota o modifica runtime.

Tutti i criteri documentali sono soddisfatti. La FASE 5D complessiva **non è completata**.

## 12. Stato operativo obbligatorio

| Voce | Stato |
| --- | --- |
| Fase/sottofase | **FASE 5D-A** |
| Stato | **COMPLETATA — AUDIT repository-only** |
| Codice/API/UI modificati | **NO** |
| Documento modificato | **SÌ — questo audit e roadmap** |
| Migration creata | **NO** |
| Migration testata | **NON APPLICABILE** |
| Migration applicata | **NO** |
| Seed/backfill creato o eseguito | **NO / NO** |
| Production interrogata/modificata | **NO / NO** |
| RLS/grant/ownership modificati | **NO / NO / NO** |
| Applications modificata | **NO** |
| Impatto Web/API | **NESSUN IMPATTO RUNTIME** |
| Impatto Mobile FASE 5 | **NOT STARTED / NON MODIFICATO** |
| Verifiche manuali/visive | **NON APPLICABILI — documentazione-only** |
| Blocker | fonti/licenze e contract manifest non ancora approvati; migration history generale incompleta |
| Prossimo passaggio autorizzabile | **5D-B — manifest contract e validator repository-only** |

## 13. Verifiche manuali

Nessuna verifica UI, Console o Network è richiesta per 5D-A perché non esiste alcuna modifica percepibile o runtime. Prima di 5D-B è richiesta esclusivamente l'autorizzazione esplicita dell'utente. Qualunque futura migration/seed da applicare a Supabase verrà indicata chiaramente e richiederà un'autorizzazione remota separata.

## 14. Dichiarazione Mobile

La repository Mobile **non è stata aperta né modificata**. La replica fino alla FASE 4 resta user-reported; Mobile parity FASE 5 rimane **NOT STARTED / NON MODIFICATO** e non è certificata da questo audit.
