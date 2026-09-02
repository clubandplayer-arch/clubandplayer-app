# FASE 5B — Contratto canonico Sports / Disciplines / Competitions

## Checkpoint

| Voce | Stato |
| --- | --- |
| Fase / sottofase | **FASE 5B** |
| Stato | **IMPLEMENTATA E TESTATA — attende autorizzazione 5C** |
| Codice modificato | Contratto TypeScript puro e test; nessun caller runtime |
| Migration creata / testata / applicata | **No / N/A / No** |
| Production interrogata / modificata | **No / No** |
| RLS / grant / ownership / Applications | **Non modificati** |
| Web / API | Nessun comportamento o payload modificato |
| Mobile | **NOT STARTED / NON MODIFICATO** |
| Verifica manuale | Non applicabile; nessuna UI o API mutata |

## Decisioni vincolanti

### Identità e label

- UUID è la reference relazionale nel database; `code` è la wire key stabile e non localizzata.
- La label localizzata è esclusivamente presentation. Non è identity, non entra nelle FK e non viene persistita al posto di code/raw value.
- Competition e season non sono identificabili dalla sola label. Una season futura usa limiti temporali; `2026/27` resta una label possibile, non una chiave universale.

### Entity graph per la futura 5C

```text
sport → discipline → variant
sport → player_role
staff_role (cross-sport di default; specialization opzionale)
sports_organization → competition → competition_level
                                      → season → competition_group
competition/season → age_class + gender_class + competition_format + territorial_scope
```

Una disciplina richiede lo sport e una variant richiede la disciplina. Un ruolo Player deve essere compatibile con lo sport; un ruolo Staff non viene artificialmente duplicato per ogni sport. Organization, country/scope e source identity distinguono competizioni omonime.

### Cardinalità

Profili e Club devono poter avere una relazione multi-sport ordinata con un solo elemento primario opzionale. I campi testuali attuali restano il contratto legacy durante la transizione. La 5B non crea relation table né cambia il significato di `profiles.sport`.

### Dimensioni non intercambiabili

- `age_class` descrive una fascia anagrafica e non un livello della piramide;
- `competition_level` descrive il livello competitivo;
- `competition_group` è una suddivisione di competition + season;
- `gender_class` è una dimensione controllata, nullable quando non pertinente, e non autorizza inferenze sui dati personali;
- `territorial_scope` è country-aware e non assume region/province italiane;
- `competition_format` descrive il formato, non la disciplina/variant.

## Contratto di compatibilità

### Read

```text
canonical reference valida
→ legacy value riconosciuto tramite mapping
→ raw legacy value invariato
→ empty
```

Un ID canonicale invalido non deve cadere silenziosamente su un'altra entità. I valori storici sconosciuti restano leggibili e mostrabili raw.

### Write futuro

- campo assente: nessuna modifica;
- canonical reference esplicita: validare intera tuple e scrivere canonical; il legacy projection è consentito solo se definito e backward-compatible;
- `null` esplicito: elimina la sola reference canonica nella prima transizione, senza cancellare automaticamente il valore storico;
- legacy-only: continua a essere accettato finché il contratto Mobile non viene migrato;
- vietati traduzione in scrittura, backfill automatico dei dati utente e inferenza da label/country/category.

Le concrete regole transazionali dual-write saranno implementate soltanto in 5E, dopo schema 5C e seed 5D.

### Freeze Web/API/Mobile

Restano accettati e restituiti senza rename o nuova obbligatorietà:

- profili: `sport`, `role`, `gender`, `club_league_category`;
- esperienze: `sport`, `role`, `category`, `club_name`, `start_year`, `end_year`, `is_current`;
- Opportunities: `sport`, `role`, `role_group`, `category`, `required_category`, `gender`, `age_min`, `age_max`.

Ownership e visibility Opportunity (`club_id`, `owner_id`, `created_by`, `status`) e tutti i contratti Applications sono fuori scope e invariati. Il Mobile pubblicato può continuare a usare le stringhe; l'aggiunta futura di campi canonicali deve essere nullable e additiva.

## Ownership dei cataloghi e provenance

- read cataloghi: riferimento pubblico secondo le policy esistenti;
- mutate: amministrazione/service workflow esplicito, mai un write utente implicito;
- ogni organization/competition importata dovrà conservare provider/source identity, country/scope e provenance;
- i seed 5D dovranno essere idempotenti e non potranno riscrivere dati utente;
- ACL effettive saranno definite e provate in PostgreSQL nella 5C, non dedotte dalla sola presenza di RLS.

## Contratto eseguibile

`lib/taxonomy/canonicalContract.ts` rende verificabili: versione, entity kinds, precedenza di lettura, freeze dei campi legacy, invarianti relazionali e validazione minima della tuple sport/discipline/variant. Non è importato da route, componenti o adapter e quindi non cambia il runtime.

## Acceptance 5B

- entity graph e significato delle dimensioni definiti;
- UUID/code/label separati;
- multi-sport e primary opzionale definiti;
- canonical-first + legacy compatibility definiti;
- payload Mobile legacy congelati;
- tuple orfane rifiutate dai test;
- nessuna migration, query Production, modifica RLS/grant/ownership/Application o UI/API.

## Rischi residui e decisioni rinviate

- Nomi e DDL esatti, FK composite, indici e policy appartengono alla 5C.
- Il catalogo reale, le fonti ufficiali, licenze e alias appartengono alla 5D.
- La proiezione legacy per ogni nuovo record richiede una matrice esplicita in 5D/5E.
- Non è autorizzato alcun backfill; qualsiasi proposta futura richiederà dry-run e autorizzazione separata.
- Il freeze protegge il contratto Mobile ma non certifica Mobile parity.

## Prossimo passaggio autorizzabile

**FASE 5C — schema additivo e migration**, soltanto previa autorizzazione. Dovrà produrre DDL additivo/nullabile, matrice RLS/grant/ownership e harness PostgreSQL locale, senza applicare migration o interrogare Production automaticamente.
