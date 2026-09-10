# FASE 6A — Audit mirato dei consumer categoria e matrice Calcio country-aware

Data audit: **2026-09-10**  
Perimetro: repository Web, sola lettura del runtime esistente; matrice documentale del solo `Calcio` per IT, FR, ES, CH, SI e PL.  
Stato: **AUDIT COMPLETATO / MATRICE DOCUMENTALE PRONTA PER REVIEW / NESSUN CATALOGO AUTORIZZATO**

## 1. Decisione di scope

Questa tranche sostituisce l'ipotesi di un audit generale dei cinque modelli profilo con il problema concreto approvato:

```text
country selezionato nel contesto corrente + sport selezionato
  -> categorie/livelli applicabili
```

La lingua UI traduce label, help e nome dello sport, ma **non traduce il nome proprio ufficiale del livello**. Per esempio, con UI inglese, country Italia e sport Football il selector conserva `Promozione` e `Prima Categoria`.

Il country effettivo non viene inferito silenziosamente:

- Search/filtri: country scelto esplicitamente nel filtro;
- Opportunity: country dell'Opportunity;
- Club: country pubblico dell'organizzazione, salvo futuro country competitivo esplicito;
- residence e country interests possono suggerire un default UX futuro, ma non sostituiscono il country selezionato;
- esperienze Player/Staff sono escluse dalla prima integrazione e restano legacy-compatible.

Sono fuori scope migration, seed, backfill, RLS, UI, API runtime, deploy, Mobile e qualsiasi write remota.

## 2. Modello esistente riutilizzabile

La foundation 5C dispone già di:

- `sports_organizations`, con `primary_country_id` e relazione multi-country;
- `competition_levels`, scoped da organization, sport, country e code, con rank, validity e stato;
- `competitions`, collegate a organization, sport, country principale e default level;
- relazioni competition-country e competition-geo-area.

Non serve quindi un nuovo array/CSV country-aware in `profiles`. Il gap è tra i consumer legacy e un catalogo `competition_levels` verificato: l'implementazione futura dovrà leggere il catalogo per ID stabili e mantenere le stringhe solo come fallback compatibile.

## 3. Inventario dei consumer

### 3.1 Fonte corrente delle opzioni

| Consumer | Stato | Comportamento osservato | Gap country-aware |
| --- | --- | --- | --- |
| `lib/opps/categories.ts` | legacy-only | `CATEGORIES_BY_SPORT` indicizzato dalla stringa sport; contenuto italiano e fallback `Altro` | manca country, organization, ID livello, validity e fonte |
| `lib/profiles/pastExperiences.ts` | legacy-only, fuori prima tranche | valida `experience.category` contro la stessa mappa sport-only | nessun country dell'esperienza; preservare senza bloccare 6A |
| `lib/i18n/controlledVocabulary.ts` | conflitto col target | traduce alcune category italiane (`Prima/Seconda/Terza Categoria`, `Amatoriale`, `Giovanili`, `Altro`) | i nomi propri federali non devono dipendere dalla lingua UI |

### 3.2 Write path e form

| Superficie | Campo | Stato | Rischio/gap |
| --- | --- | --- | --- |
| `ProfileEditForm` Club | `profiles.club_league_category` | stringa legacy; opzioni sport-only | cambio country non ricalcola il catalogo; nessun level ID |
| `OpportunityForm` create | `opportunities.category` | opzioni sport-only; reset solo al cambio sport | country già disponibile nel form ma non entra nella lookup |
| Opportunity create API | `category`, `required_category` | accetta stringhe; ramo football/player tratta `required_category` anche come ruolo normalizzato EN | `required_category` mescola categoria competitiva e posizione/ruolo: non va migrato alla cieca |
| Opportunity edit legacy | `required_category` | input testuale e route PATCH compatibile | non usa country/sport catalog; deve restare fallback durante una futura tranche |
| Experiences API/form | `athlete_experiences.category` | stringa legacy | esplicitamente differita; nessuna modifica in 6A |

### 3.3 Read, filtri e presentazione

| Superficie | Stato | Nota per il futuro |
| --- | --- | --- |
| Opportunities list/filter | filtra `required_category` testuale e costruisce opzioni dai risultati o da `CATEGORIES_BY_SPORT` | il filtro futuro deve usare country+sport+level ID; deep link legacy ancora leggibile |
| Opportunity detail/table/feed | mostra `category`/`required_category`, spesso tramite localizzazione generica | mostrare il nome ufficiale restituito dal catalogo; fallback stringa invariato |
| Club public profile/header/cards/map | legge `club_league_category` testuale | aggiungere level display canonical-first senza esporre nuovi dati privati |
| Player public profile/experience card | mostra categoria esperienza testuale | fuori prima tranche |
| Search/Discover/WhoToFollow | non possiede un contratto category canonicale uniforme | non anticipare ranking o matching; il primo obiettivo è il selector esplicito |

### 3.4 Ambiguità semantiche da non propagare

1. `club_league_category` è un livello/competizione del Club.
2. `opportunities.category` può rappresentare una categoria competitiva.
3. `opportunities.required_category` è usato anche nel ramo legacy football/player come posizione (`goalkeeper`, `defender`, `midfielder`, `forward`).
4. `athlete_experiences.category` è la categoria storica di una singola esperienza.
5. age class, gender category, competition, competition level e competition group non sono sinonimi.

Prima di una write canonica occorre quindi un contratto campo-per-campo; rinominare soltanto la label UI non risolve il modello.

## 4. Contratto selector raccomandato (non implementato)

Input minimo:

```ts
type FootballLevelQuery = {
  countryId: string;
  sportId: string;
  organizationId?: string;
  asOf?: string;
};
```

Output minimo:

```ts
type FootballLevelOption = {
  id: string;
  code: string;
  officialName: string;
  levelRank: number | null;
  organizationId: string;
  countryId: string;
  validFrom: string | null;
  validTo: string | null;
};
```

Regole:

1. country e sport sono obbligatori; nessun default Italia server-side;
2. il cambio country o sport azzera un valore non applicabile;
3. `officialName` non passa da `localizeOpportunityCategory`;
4. label UI come “Categoria”, “Seleziona” e “Altro” restano traducibili;
5. label omonime sono identità diverse quando cambiano sport, organizer o country;
6. categorie territoriali richiedono organizer territoriale; non inventare una competition nazionale generica;
7. una denominazione sponsorizzata è validity-aware e non sovrascrive automaticamente il nome stabile;
8. i record legacy non riconosciuti restano visualizzabili e modificabili tramite un percorso compatibile esplicito.

## 5. Matrice ufficiale iniziale — Calcio senior

### Lettura della matrice

- **Verificato**: denominazione e scope risultano da una fonte dell'organismo ufficiale già censita.
- **Candidate territoriale**: famiglia di label osservata, ma identity, organizer e/o stagione devono essere verificati prima del catalogo.
- La matrice non è un seed e non dichiara completa ogni piramide.
- Il primo perimetro è il calcio a 11 senior. Futsal, calcio a 8, femminile, giovanili, riserve, veterani e coppe sono separati.
- Le divisioni professionistiche sono riportate solo quando servono a rendere comprensibile il boundary; la priorità prodotto resta dilettantistica.

| Country | Organizer/scope | Denominazioni native utilizzabili dopo review | Evidenza | Copertura e blocchi |
| --- | --- | --- | --- | --- |
| IT | FIGC/LND; Comitati Regionali e Delegazioni | `Serie D`; `Eccellenza`; `Promozione`; `Prima Categoria`; `Seconda Categoria`; `Terza Categoria` | `Serie D` verificata sul portale LND; le altre label coincidono col catalogo legacy ma richiedono evidence pack nazionale/regionale corrente prima del seed | **Parziale**: le competizioni territoriali devono conservare Comitato/Delegazione e stagione; rimuovere dal calcio voci non-level o incoerenti (`FIP`, enti promozionali, `E.I.F.A.`, generici `ELITE`/`Giovanili`) |
| FR | FFF; Ligues régionales; Districts | `National`; `National 2`; `National 3` | **Verificato** su calendario, portale e regolamento FFF 2025-2026 | **Parziale utile**: `Régional 1/2/3` e livelli Départemental non diventano identità nazionali; richiedono Ligue/District e stagione |
| ES | RFEF; Federaciones Territoriales | `Primera Federación`; `Segunda Federación`; `Tercera Federación` | **Verificato** sul portale competizioni RFEF 2025-2026 | **Parziale utile**: `Preferente`, `Primera`, `Segunda`, ecc. variano per federation territoriale e non vanno fuse per la sola label |
| CH | SFV/ASF; Erste Liga; Amateur Liga; associazioni regionali | `Promotion League`; `1. Liga Classic`; `2. Liga interregional` | `Promotion League` e `2. Liga interregional` verificate nel Match Center; formula/nome corrente di `1. Liga Classic` da ricontrollare | **Parziale utile**: `2. Liga`, `3. Liga`, `4. Liga`, `5. Liga` sono territoriali; equivalenti DE/FR/IT si collegano solo mediante la stessa identity SFV, non per traduzione libera |
| SI | NZS; MNZ | `2. slovenska nogometna liga` (`2. SNL`); `3. slovenska nogometna liga` (`3. SNL`) | **Verificato** nel portale competizioni/licensing NZS; `Prva liga` è boundary superiore | **Parziale utile**: livelli sotto `3. SNL` richiedono organizer MNZ e stagione; non creare un generico `regionalna liga`/`medobčinska liga` |
| PL | PZPN; WZPN | `III liga`; `IV liga`; `Klasa Okręgowa`; `Klasa A`; `Klasa B`; eventuale `Klasa C` | `III liga` verificata come family PZPN; `IV liga` verificata come livello WZPN; classi inferiori candidate per WZPN | **Parziale**: disponibilità, rango e perfino presenza di `Klasa C` non sono uniformi; ogni identity territoriale richiede WZPN e stagione |

### 5.1 Fonti ufficiali già censite

- IT: [Lega Nazionale Dilettanti — Serie D](https://lnd.it/seried/archivio-seried/serie-d/) e [Comunicati LND](https://lnd.it/comunicati/).
- FR: [FFF — calendario competizioni senior maschili 2025-2026](https://www.fff.fr/article/14528-competitions-seniors-masculines-calendrier-2025-2026.html), [National 2](https://epreuves.fff.fr/competition/engagement/3-national-2), [National 3](https://www.fff.fr/237-.html), [regolamento National 3 2025-2026](https://media.fff.fr/uploads/documents/reglement-du-national-3-20252026-ok.pdf).
- ES: [RFEF — Primera Federación](https://rfef.es/es/competiciones/primera-federacion) e [RFEF — competiciones](https://rfef.es/es/competiciones).
- CH: [SFV/ASF Match Center](https://matchcenter.football.ch/) e [2. Liga interregional 2026](https://matchcenter.football.ch/default.aspx?oid=1&lng=1&s=2026&ln=21020).
- SI: [NZS — seznam tekmovanj](https://www.nzs.si/seznam-tekmovanj?id_menu=410) e [NZS — licenciranje 2. SNL/3. SNL](https://www.nzs.si/podrocja/novinarji/novice/rezultati-licenciranja-nogometnih-klubov-2-snl-3-snl-379342).
- PL: [PZPN/Łączy nas piłka — rozgrywki](https://www.laczynaspilka.pl/rozgrywki).

Le fonti sopra provano denominazioni/scope nei limiti dichiarati; non costituiscono automaticamente licenza per copiare un database. Gli evidence pack 5D-E restano il gate per provenance, stable ID, versione, copertura, termini e checksum prima di qualsiasi import automatico.

## 6. Gap e rischi classificati

| Priorità | Gap | Classe | Decisione |
| --- | --- | --- | --- |
| P0 | nessun repository read country+sport per `competition_levels` | API/repository | progettare read-only dopo review matrice |
| P0 | cataloghi football dei sei country non materializzati | catalog/provenance | completare evidence pack per una tranche country/organizer alla volta |
| P0 | `required_category` ambiguo con la posizione player | contratto dati | separare prima di collegare level ID; nessun backfill deduttivo |
| P1 | Profile/Opportunity selector sport-only | UI | collegare solo dopo read contract e catalogo approvati |
| P1 | traduzione automatica di alcune category | i18n | limitare la traduzione alle label generiche; preservare official name |
| P1 | categorie territoriali senza organizer | identità/cardinalità | chiave minima country+sport+organizer+level+validity |
| P2 | esperienze prive di country proprio | profilo legacy | differire; non usare residence/interessi come sostituto |
| P2 | filtri/deep link solo testuali | compatibility | futuro canonical-first con fallback legacy esplicito |

## 7. Esito e prossimo checkpoint

L'audit conferma che il problema è circoscritto ma non è risolvibile aggiungendo semplicemente `country` a `CATEGORIES_BY_SPORT`. La foundation relazionale esiste; servono dati verificati, un read contract e una separazione del significato dei campi legacy.

**Prossimo passaggio proposto, soggetto a review:** `6B — contratto read-only country + sport (+ organizer) per competition levels e piano evidence della prima tranche Calcio`, senza UI, migration, seed o write remota.

Non sono autorizzati automaticamente:

- promozione delle candidate territoriali a valori selezionabili;
- scraping/import dei portali federali;
- traduzione dei nomi propri;
- deduzione del country da lingua, nationality, residence o interessi;
- canonicalizzazione delle esperienze Player/Staff;
- modifica di Opportunities, Search, ranking o Mobile.

## 8. Sottofasi operative approvate

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 6A | audit mirato dei consumer e matrice documentale Calcio IT/FR/ES/CH/SI/PL | **COMPLETATA** |
| 6B | contratto e repository read-only country+sport(+organizer), bounded e fail-closed | **COMPLETATA repository-only** |
| 6C | evidence pack e catalogo revisionabile del Calcio, una authority/country alla volta | non iniziata |
| 6D | piano minimo di materializzazione dei cataloghi e verifica schema/policy, senza backfill deduttivi | non iniziata |
| 6E | endpoint read-only per i selector, payload additivo e cache/limiti | non iniziata |
| 6F | selector Club country-aware e denominazioni native indipendenti dalla lingua UI | non iniziata |
| 6G | selector e filtri Opportunities country-aware, preservando ownership, Applications e campi legacy | non iniziata |
| 6H | estensione agli altri sport, una matrice country/sport approvata alla volta | non iniziata |
| 6I | regressione IT/FR/ES/CH/SI/PL, legacy/new, lingue UI e certificazione finale | non iniziata |

### Esito 6B

`lib/taxonomy/countryCompetitionLevels.server.ts` implementa il primo step successivo senza route né consumer runtime:

- input obbligatorio `countryId` + `sportId`, con `organizationId`, `asOf` e `limit` opzionali;
- validazione UUID/data/limite prima di interrogare il data source;
- country supported+active, sport active e organization active appartenente al country;
- lettura esclusivamente di livelli active e validi alla data richiesta;
- limite massimo 200 e query `limit + 1` per rilevare overflow senza restituire cataloghi troncati;
- output con `officialName`, senza parametro locale e senza traduzione i18n;
- error states stabili e fail-closed;
- adapter Supabase solo `SELECT`, nessuna route, UI, migration, seed o write.

Il prossimo checkpoint è **6C**. La sua apertura non autorizza import o seed: deve prima produrre/revisionare l'evidence pack della singola authority/country scelta.
