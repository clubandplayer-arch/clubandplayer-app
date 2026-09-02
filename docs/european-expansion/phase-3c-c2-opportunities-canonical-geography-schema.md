# FASE 3C-C2 — Opportunities canonical geography schema contract

## 1. Esito e perimetro

**Esito: PASS — contratto schema repository-only completato il 2026-08-31.** C2 definisce il modello canonico additivo delle Opportunities e chiude le decisioni necessarie alla futura migration C3. Non crea né modifica migration, schema runtime, RLS, trigger, funzioni, API, UI, dati, feature gate o repository mobile. Non esegue query remote, scritture, backfill o applicazioni Production.

Documento master e audit C1 sono stati riletti prima della progettazione. Restano vincolanti `geo_areas` come fonte geografica canonica, gerarchie country-aware a profondità variabile, canonical-first, compatibilità legacy Italia, ownership Opportunities invariata e separazione delle semantics applicant/Club.

## 2. Decisioni C2 approvate nel contratto

| Tema | Decisione C2 |
| --- | --- |
| Colonna Paese | `public.opportunities.country_id uuid null` |
| Colonna area | `public.opportunities.geo_area_id uuid null` |
| Cardinalità | Una singola location canonica per Opportunity; multi-location/remote non sono modellati implicitamente |
| Country-only | Consentito: `country_id` valorizzato e `geo_area_id` null |
| Area senza country | Vietata dal database |
| Livello selezionabile | Qualunque `geo_areas` attiva del Paese, inclusa root o livello intermedio; nessun obbligo municipality |
| Coerenza | FK dirette e FK composita `(geo_area_id, country_id) → geo_areas(id, country_id)` |
| Nullability | Entrambe nullable per preservare tutte le righe e i writer legacy |
| Default | Nessun default, in particolare nessun default Italia |
| Delete behavior | `ON DELETE RESTRICT` per country e area canonici |
| Legacy geography | `country`, `region`, `province`, `city` restano inalterati e nullable |
| Ownership/applications | Nessuna modifica a `owner_id`, `created_by`, `club_id`, trigger, RLS o `applications` |
| Backfill | Nessun backfill in C2 o nella migration strutturale C3 |
| Sede Club | Nessuna derivazione/default automatico da profilo, residence, interessi o sede pubblica Club |

I nomi brevi `country_id` e `geo_area_id` sono scelti definitivamente per coerenza con `opportunities.country` e con il catalogo canonico esistente. La semantica è sempre **location della Opportunity**, mai residenza del Club o dell'applicant.

## 3. DDL blueprint vincolante per C3

Il seguente frammento è una specifica verificabile, **non una migration eseguibile introdotta da C2**. C3 dovrà tradurlo in una migration additiva, idempotente e localmente testata senza modificare migration precedenti.

```sql
alter table public.opportunities
  add column if not exists country_id uuid,
  add column if not exists geo_area_id uuid;

alter table public.opportunities
  drop constraint if exists opportunities_country_fk,
  add constraint opportunities_country_fk
    foreign key (country_id)
    references public.countries(id)
    on delete restrict,
  drop constraint if exists opportunities_geo_area_fk,
  add constraint opportunities_geo_area_fk
    foreign key (geo_area_id)
    references public.geo_areas(id)
    on delete restrict,
  drop constraint if exists opportunities_geo_country_required_check,
  add constraint opportunities_geo_country_required_check
    check (geo_area_id is null or country_id is not null),
  drop constraint if exists opportunities_geo_country_fk,
  add constraint opportunities_geo_country_fk
    foreign key (geo_area_id, country_id)
    references public.geo_areas(id, country_id)
    on delete restrict;

create index if not exists opportunities_country_id_idx
  on public.opportunities (country_id);

create index if not exists opportunities_geo_area_id_idx
  on public.opportunities (geo_area_id);
```

### Motivazione dei quattro vincoli

1. `opportunities_country_fk` impedisce country ID inesistenti anche in modalità country-only.
2. `opportunities_geo_area_fk` esprime esplicitamente l'integrità dell'area e produce un errore chiaro indipendente dalla FK composita.
3. `opportunities_geo_country_required_check` è necessario perché PostgreSQL usa `MATCH SIMPLE`: una FK composita da sola non rifiuta una coppia con una componente null.
4. `opportunities_geo_country_fk` riusa `geo_areas_id_country_key` già disponibile e impedisce combinazioni area/Paese incoerenti.

Non è richiesto un indice composito aggiuntivo `(country_id, geo_area_id)` in C3: gli indici singoli coprono i filtri country ed exact area iniziali; la FK composita non richiede un indice sul lato referencing per essere valida. C6 dovrà misurare query descendants e aggiungere un indice ulteriore soltanto se un query plan reale lo giustifica.

## 4. Stati validi e invalidi

| `country_id` | `geo_area_id` | Validità | Significato |
| --- | --- | --- | --- |
| null | null | Valido | Opportunity legacy o location non dichiarata |
| valorizzato | null | Valido | Location country-only |
| valorizzato | stessa country | Valido | Location canonica con scope territoriale |
| null | valorizzato | Non valido | Rifiutato dal check |
| country A | area country B | Non valido | Rifiutato dalla FK composita |
| ID inesistente | qualsiasi | Non valido | Rifiutato dalle FK dirette |

La migration C3 deve lasciare tutte le righe esistenti nello stato `(null, null)`: nessuna riga legacy deve diventare non valida o ricevere un'inferenza automatica.

## 5. Catalogo e regole runtime future

Lo schema referenzia l'intero catalogo `countries`; non può e non deve codificare in un check lo stato mutabile `is_supported/is_active`. In C4/C5, i **nuovi write canonici interattivi** dovranno accettare soltanto countries supported+active e geo areas attive appartenenti al Paese. Le righe storiche restano leggibili anche se in futuro un catalog entry viene disattivato.

Una `geo_area_id` può riferire root, livello intermedio o foglia. Questa decisione supporta country-only e gerarchie reali differenti:

- IT `REGION → PROVINCE → MUNICIPALITY`;
- FR `REGION → DEPARTMENT → COMMUNE`;
- ES `AUTONOMOUS_COMMUNITY → PROVINCE → MUNICIPALITY`;
- CH `CANTON → DISTRICT? → MUNICIPALITY`;
- SI `STATISTICAL_REGION → MUNICIPALITY`;
- PL `VOIVODESHIP → POWIAT → GMINA`.

Il database garantisce appartenenza al Paese, non completezza/attività della chain. C4 dovrà validare lato server l'area, il Paese e una traversal ancestors coerente; nessun client payload potrà fornire ancestors autorevoli.

## 6. Contratto di lettura per C4

La priorità è:

```text
country_id + geo_area_id e ancestors canonici
↓
country_id country-only
↓
eventuale mapping legacy Italia dimostrabilmente univoco
↓
country / region / province / city testuali
↓
location assente
```

Per Opportunities non esistono legacy geography IDs. `legacy_geo_area_mappings` mappa ID legacy, non combinazioni testuali; quindi C4 **non deve dichiarare canonicale** una risoluzione basata soltanto su uguaglianze fuzzy di label. Finché non esiste un resolver testuale deterministico, verificato e non ambiguo, il ramo “mapping legacy Italia” è non disponibile e si passa al fallback testuale. Questo rispetta la priorità master senza inventare canonical data.

Se `country_id` è valorizzato ma `geo_area_id` è null, il read restituisce country-only e non completa la location dalla sede Club o dai campi testuali. I campi testuali restano disponibili come compatibility metadata, ma non prevalgono sul country canonico esplicito.

## 7. Contratto di proiezione legacy per C4

Un futuro write canonico completo dovrà derivare lato server i label dalla chain canonica, mai fidarsi dei label inviati dal client. La proiezione raccomandata nei campi legacy è semantica per `area_type`:

| Bucket legacy | `area_type` canonici |
| --- | --- |
| `region` | `REGION`, `AUTONOMOUS_COMMUNITY`, `CANTON`, `STATISTICAL_REGION`, `VOIVODESHIP` |
| `province` | `PROVINCE`, `DEPARTMENT`, `DISTRICT`, `POWIAT` |
| `city` | `MUNICIPALITY`, `COMMUNE`, `GMINA` |

Esempi: CH senza District proietta `region=Canton`, `province=null`, `city=Municipality`; SI proietta `region=Statistical Region`, `province=null`, `city=Municipality`. Se l'area selezionata è root o intermedia, i bucket inferiori sono null.

Il valore legacy `country` deve continuare a essere un label compatibile con le superfici esistenti; l'ISO2 autorevole resta ricavato da `country_id`. La localizzazione esatta del label legacy sarà fissata nel contratto C4, preservando i dati correnti e senza riscrivere righe non toccate.

Operazioni future distinte:

- **absent in PATCH:** nessuna modifica canonical o legacy;
- **reset esplicito:** entrambi gli ID e i quattro campi testuali null;
- **country-only:** `country_id` valorizzato, `geo_area_id` null, `country` proiettato e region/province/city null;
- **full:** IDs coerenti più proiezione ancestors;
- **legacy-only writer:** continua a scrivere i campi testuali senza obbligo di IDs.

L'atomicità appartiene a C4 e non è implementata in C2.

## 8. Filtri e descendants

C2 riserva i parametri canonici futuri `countryId`/`country_id` e `geoAreaId`/`geo_area_id`; C6 definirà un solo formato pubblico preferito mantenendo gli alias legacy. La precedenza raccomandata è filtro canonico esplicito, poi filtro testuale legacy.

Un filtro exact area usa `opportunities.geo_area_id = :id`. Un filtro territoriale inclusivo deve prima ottenere l'insieme area+descendants country-aware e poi filtrare le Opportunities. Non si deve assumere che equality includa i figli né aggiungere a C3 una closure table non auditata. C6 dovrà definire limite, pagination/query plan e comportamento delle Opportunity country-only.

## 9. RLS, ownership e applications

C3 non deve creare, eliminare o rinominare policy Opportunities e non deve modificare `FORCE RLS`. Le colonne canonicali ereditano le policy di riga esistenti: non introducono una nuova classe di owner né un accesso separato.

Restano invarianti:

- `owner_id` e `created_by`: user UUID/fallback ownership;
- `club_id`: profile UUID nei writer correnti;
- Club-only create e owner-only mutation applicativa;
- `applications.athlete_id`: user UUID applicant, compatibile Athlete/Player e Staff;
- `applications.club_id`: user UUID owner;
- no self-application, unique `(opportunity_id, athlete_id)`, status, notifiche e candidatura cross-country.

La futura verifica dello stato RLS remoto, già richiesta da C1, non autorizza modifiche RLS dentro C3.

## 10. Compatibilità, rollout e rollback

La struttura è additive perché:

- non rinomina/rimuove colonne;
- non impone `NOT NULL`;
- non aggiunge default;
- non modifica righe esistenti;
- non cambia query, payload o response prima di C4;
- non collega UI prima di C5;
- non cambia filtri prima di C6.

C3 dovrà essere applicabile su fixture con Opportunities legacy, parziali e null. Il rollback locale della sola struttura potrà rimuovere indici, constraint e colonne soltanto nel database temporaneo; non va prodotto o applicato come destructive Production migration dopo che eventuali C4+ write avranno popolato dati.

## 11. Criteri di accettazione C3 derivati

C3 potrà dirsi pronta soltanto se la migration:

1. contiene esclusivamente DDL additivo qui definito;
2. è idempotente rispetto a colonne/indici e gestisce deterministicamente i constraint;
3. non contiene `UPDATE`, `INSERT`, `DELETE`, backfill o default IT;
4. non modifica RLS, grants, trigger, funzioni, ownership, applications o tabelle legacy;
5. accetta `(null,null)`, country-only e area coerente;
6. rifiuta area senza country, mismatch country/area e ID inesistenti;
7. preserva fixture Opportunity e Application byte-for-byte salvo le nuove colonne null;
8. supera un runtime harness PostgreSQL locale con rollback;
9. resta non applicata a remote/Production finché non esplicitamente autorizzata.

## 12. Decisioni residue dopo C2

Nessuna decisione di naming, nullability, cardinalità, FK, check, delete behavior, default, backfill o livello selezionabile resta aperta per C3.

Restano intenzionalmente alle fasi competenti:

- C3: forma idempotente finale della migration e runtime harness locale;
- C4: API contract, atomicità, label legacy country e resolver/proiezione;
- C5: UX selector e comportamento edit legacy;
- C6: descendants, parametri pubblici e query plan;
- C7: certificazione RLS effettiva, regressione e cross-country applications;
- fase prodotto futura: remote/hybrid e multi-location.

## 13. Stato operativo C2

| Voce | Stato |
| --- | --- |
| Codice comportamentale | NON MODIFICATO |
| Schema runtime | NON MODIFICATO |
| Migration | NON CREATA |
| Migration testata localmente | NON APPLICABILE IN C2 |
| Migration applicata | NO |
| Production | NON INTERROGATA / NON MODIFICATA |
| Web | Contratto schema documentato; UI non collegata |
| Mobile | NOT STARTED / NON MODIFICATO |
| Verifica manuale/visiva | NESSUNA VERIFICA MANUALE APPLICABILE |
| Blocker C2 | NESSUNO |
| Prossimo passaggio autorizzabile | C3 — migration additive, solo previa autorizzazione esplicita |

**Fermarsi al termine di C2. Non creare la migration C3 senza autorizzazione esplicita.**
