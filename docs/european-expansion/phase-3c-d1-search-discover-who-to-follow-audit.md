# FASE 3C-D1 — Search / Discover / WhoToFollow audit

## Esito e perimetro

**Esito: PASS — audit repository-only completato il 2026-09-01.** Questo documento fotografa il contratto osservabile al commit di partenza `582b3686bea371346bc8526b51ff871261dbd31b`. D1 non modifica query, ranking, API, UI, schema, migration, RLS, dati o applicazioni mobile e non usa né crea file binari.

La FASE 3C-C è già chiusa: le Opportunities possiedono geografia canonica e fallback legacy. D1 non riapre quel perimetro e non considera la semplice presenza di `country_id`/`geo_area_id` nelle Opportunities come completamento dello scouting internazionale.

## 1. Superfici e dipendenze osservate

| Superficie | Writer/reader principale | Stato geografico osservato |
| --- | --- | --- |
| Search globale | `GET /api/search`, pagina `/search` | Filtri testuali `country`, `region`, `province`, `city`; le sole Opportunities usano già label canonical-first in output, ma il filtro Search resta legacy. |
| Discover | pagina `/discover` → `GET /api/follows/suggestions` | Scope `country|region|province|city` basato su testi del viewer; copy “Tutta Italia”; nessun ID canonico. |
| WhoToFollow feed | `WhoToFollow` → `GET /api/follows/suggestions` | Usa i default dell'endpoint; risultati ordinati per blocchi e recenza, non per score geografico esplicito. |
| WhoToFollow alternativo | `GET /api/suggestions/who-to-follow` | Pipeline distinta: city → province → region → country → sport → recent; solo campi testuali. |
| Pagina WhoToFollow | `/who-to-follow` | Riusa il componente feed; non introduce un contratto geografico ulteriore. |
| Search Map | `/search-map`, `/api/search/map`, `/api/search/clubs-in-bounds` | Perimetro FASE 3C-E: non viene modificato in 3C-D. |

Esistono quindi **due endpoint di suggerimenti** con contratti e fallback non equivalenti. D2–D7 devono evitare di aggiungere due implementazioni canonicali divergenti: occorre prima estrarre un resolver/ranking contract condiviso oppure dichiarare un endpoint canonico e mantenere l'altro come adapter compatibile.

## 2. Search globale: contratto attuale

`GET /api/search` cerca Club, Institution, Player, Staff, Opportunities, Post ed Event. Richiede una query testuale di almeno due caratteri, supporta paginazione e filtri `country`, `region`, `province`, `city`, `sport`, `role` e `status`.

Il filtro country trasforma un ISO2 noto nel relativo label e confronta entrambi contro `country` testuale. Region/province/city usano `ilike`. Questa logica:

- non accetta `countryId` o `geoAreaId`;
- non valida country/area contro i cataloghi canonici;
- non include descendants di un'area canonica;
- applica lo stesso filtro testuale a entità con fonti geografiche differenti;
- filtra Post/Event tramite una lista preventiva di author ID, non tramite una geografia propria del contenuto;
- può produrre conteggi e risultati coerenti tra loro nel modello legacy, ma non definisce ancora la semantica di un filtro canonico cross-kind.

Le Opportunities rappresentano un caso parzialmente più avanzato: il select include `country_id`/`geo_area_id` e il subtitle usa la geografia risolta canonical-first. Tuttavia `buildOpportunityQuery` continua ad applicare esclusivamente i filtri testuali comuni. La FASE 3C-D non deve duplicare il resolver già presente in `lib/opportunities/geography.ts` né regredire i parametri legacy.

## 3. Discover e WhoToFollow: candidate selection attuale

### Endpoint `/api/follows/suggestions`

- autentica il viewer, esclude self e profili già seguiti e applica i filtri di visibilità/completamento;
- ricava lo scope del viewer con precedenza `interest_*` testuale → location testuale;
- applica `geoScope` su una singola granularità (`city`, `province`, `region` o `country`), confrontando target `interest_*` **oppure** target location;
- combina geografia e sport tramite gruppi di fallback;
- quota i tipi in alcuni percorsi e ordina principalmente per `updated_at` (Institution per nome);
- non calcola né espone uno score stabile o una motivazione di ranking;
- non legge residence canonicale, country interests canonici, geo-area interests canonici o `open_to_relocation`.

### Endpoint `/api/suggestions/who-to-follow`

- autentica il viewer, esclude self/follow esistenti e filtra i profili eleggibili;
- prova in sequenza city, province, region e country testuali, poi sport e infine recenza;
- interrompe quando raggiunge il limite: il ranking dipende quindi dall'ordine dei bucket, non da uno score confrontabile;
- seleziona ancora legacy `interest_region_id`, `interest_province_id` e `interest_municipality_id`, ma non li usa per un matching canonico;
- non legge le nuove tabelle di interessi canonici né relocation.

La duplicazione rende possibile che Discover e il widget feed mostrino candidati differenti a parità di viewer e parametri. La compatibilità richiede che la futura convergenza conservi shape, esclusioni, visibility, account type e fallback di disponibilità, senza promettere identità dell'ordine legacy.

## 4. Sorgenti geografiche e semantica

Le fonti presenti non sono intercambiabili:

| Fonte | Significato | Uso corretto futuro |
| --- | --- | --- |
| `profile_preferences.residence_country_id` / `residence_geo_area_id` | Residenza canonica del profilo | Geografia del candidato/viewer, con fallback legacy quando assente. |
| `profile_country_interests` | Paesi verso cui il profilo esprime interesse | Preferenze del **viewer** per scouting/mobility; non è la residenza del target. |
| `profile_geo_area_interests` | Aree territoriali di interesse | Preferenze del **viewer**, includendo una semantica descendants esplicita. |
| `profile_preferences.open_to_relocation` | Disponibilità dichiarata alla relocation | Segnale di eligibility/ranking definito dal prodotto; non autorizza a inventare una destinazione. |
| `profiles.interest_country/region/province/city` | Preferenze legacy testuali | Fallback compatibile finché i dati canonici non sono presenti. |
| `profiles.country/region/province/city` e viste derivate | Location legacy | Fallback della residenza/location target; non va confusa con interessi. |
| Opportunity `country_id`/`geo_area_id` | Luogo della Opportunity | Filtro Search per Opportunities; non definisce la residenza del Club owner. |

**Precedenza raccomandata per leggere le preferenze del viewer:** interessi country/area canonici → interessi legacy testuali → nessun preference boost. **Precedenza raccomandata per la location del target:** residence canonica → mapping legacy deterministico già disponibile → testi legacy. La location del target non deve essere sostituita dai suoi interessi.

## 5. Boundary RLS e privacy

`profile_preferences`, `profile_country_interests` e `profile_geo_area_interests` hanno policy repository osservabili own-or-admin. Un client autenticato può quindi leggere le proprie preferenze, ma non usarle direttamente per interrogare le preferenze private di tutti gli altri profili.

Questo è coerente con il matching raccomandato: Search/Discover devono leggere gli interessi del viewer e confrontarli con la location pubblicabile del target. Se una fase futura necessita `open_to_relocation` o altri segnali privati del target, deve introdurre un boundary server/SQL dedicato e revisionato, con minimo dato esposto; non deve usare service role per aggirare RLS in modo generale né rendere pubbliche intere tabelle di preferenze.

Lo stato RLS Production non è certificato da questo audit repository-only. Prima di una migration/RPC dedicata serviranno test PostgreSQL locali per anon, authenticated owner, authenticated non-owner e admin, senza query remote implicite.

## 6. Rischi funzionali e di performance

1. **Semantica cross-kind:** un'area canonica può filtrare direttamente Opportunities, ma profili e author di Post/Event richiedono un resolver di residence/location distinto.
2. **Descendants:** equality su `geo_area_id` non include le aree figlie; il comportamento deve essere condiviso con il modello gerarchico e limitato a country coerente.
3. **Legacy collision:** label omonimi tra Paesi non possono essere considerati canonical match senza country context.
4. **Ranking instabile:** bucket sequenziali più `updated_at` cambiano l'ordine al variare del limite e non producono spiegazioni ripetibili.
5. **Duplicazione:** due endpoint WhoToFollow possono divergere su esclusioni, quota account type, sport e geografia.
6. **Fan/Club/Institution:** gli interessi mobility canonici sono intenzionalmente limitati a Player/Staff; non bisogna inventare preferenze per altri account type.
7. **Relocation:** `open_to_relocation=false` non deve nascondere universalmente un profilo dalla Search; è un segnale contestuale, non uno stato di pubblicazione.
8. **Query fan-out:** risolvere residence/interessi riga per riga introdurrebbe N+1; i resolver devono lavorare per batch o tramite query/RPC indicizzata.
9. **Conteggi:** Search deve applicare lo stesso scope canonico a result query e count query.
10. **Maps:** coordinate e bounds restano fuori fase; D non deve modificare SearchMap/ClubMap incidentalmente.

## 7. Contratto di compatibilità da preservare

- query testuale, type, page, limit, status e filtri legacy di Search;
- output per kind e conteggi coerenti;
- profili legacy privi di residence/interessi canonici ancora ricercabili e suggeribili;
- visibility, completion, self-exclusion e already-followed exclusion;
- account type Club, Institution, Player e Staff e relative label/display name;
- Opportunities canonical-first già implementate, inclusi fallback legacy;
- nessuna restrizione automatica cross-country per applications o follows;
- nessuna esposizione pubblica di preference tables;
- nessuna modifica a RLS, ownership, follow graph o notifiche senza fase esplicita;
- nessun file binario e nessuna modifica mobile in 3C-D.

## 8. Decisioni architetturali per D2

D2 deve produrre un contratto condiviso e testabile prima di cambiare le query:

1. parametri URL additivi `countryId`/`geoAreaId` con alias snake_case, canonical-first e fallback dei parametri legacy solo quando gli ID sono assenti;
2. validazione country/area attive, supportate e same-country;
3. area scope che include descendants e impedisce cross-country leakage;
4. resolver batch della location profilo canonical-first, senza N+1;
5. resolver delle preferenze **del viewer** con priorità canonica e fallback legacy;
6. score deterministico a componenti nominate (area, country, sport, relocation, legacy fallback, recency tie-break), senza penalizzare l'assenza di dati canonici come se fosse una preferenza negativa;
7. reason codes interni testabili, senza esporre dati privati;
8. un endpoint primario WhoToFollow e un adapter compatibile per il secondo contratto;
9. medesimo scope per query e count Search;
10. feature rollout separato da Maps e da qualsiasi write/backfill.

## 9. Piano progressivo D2–D7

### D2 — canonical filtering/ranking contract

Definire tipi, precedenze, resolver, descendants, privacy/RLS boundary, reason codes e matrice legacy. Nessuna modifica UI o ranking attivo.

### D3 — Search canonical filters

Aggiungere `countryId`/`geoAreaId` a Search globale con validazione server, query/count coerenti, Opportunities canonicali e profili canonical-first. Conservare filtri testuali legacy.

### D4 — Discover / WhoToFollow data boundary

Unificare la selezione candidati dietro un servizio condiviso, leggere in modo autorizzato residence e interessi del viewer e mantenere adapter/output esistenti.

### D5 — international ranking e relocation

Attivare score deterministico e compatibile con legacy, includendo country interests, geo-area interests, sport e relocation secondo regole di prodotto esplicite e testate.

### D6 — UI e scouting internazionale

Integrare selector/filtri canonici nelle superfici Search/Discover appropriate, rimuovere copy Italia-only, mostrare reason label non sensibili e verificare accessibilità/URL compatibility.

### D7 — regressione e backward compatibility

Certificare IT legacy, IT/FR/ES/CH/SI/PL canonici, account type, country-only, area+descendants, interests multipli, relocation true/false, no-interests, Search counts, follow exclusions, visibility, RLS e performance. Mobile resta una fase separata finché non viene esplicitamente autorizzata.

## 10. Stato al termine di D1

**D1 è COMPLETATA / PASS.** Nessun comportamento runtime è cambiato. **D2 è il prossimo passo sicuro**, ma richiede autorizzazione separata: non è stata avviata da questo audit.
