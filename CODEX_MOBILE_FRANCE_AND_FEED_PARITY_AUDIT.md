# Codex Mobile — audit e piano di parity 1:1 Web/Mobile

**Repository Web di riferimento:** `clubandplayer-app` (accesso Mobile: sola lettura)  
**Baseline precedente:** commit `a938894`  
**Branch/livello superiore auditato:** `codex/implementa-integrazione-francia-secondo-documentazione`, ricostruito nel checkout corrente come intervallo `a938894..0e61b65`  
**Branch/livello corrente auditato:** `codex/allinea-valori-iscrizioni-e-feed`, ricostruito come intervallo `0e61b65..70f7079`  
**HEAD certificato per questo handoff:** `70f7079`

> Nota sui nomi branch: nel checkout di audit il branch locale disponibile si chiama `work`; gli intervalli sopra sono stati identificati dalla sequenza dei commit e sono la sorgente verificabile. Mobile deve leggere i file a `70f7079` (o a un discendente che includa quel commit), non basarsi soltanto sui nomi remoti.

## 1. Obiettivo e definizione di “parity 1:1”

Mobile deve replicare **comportamenti, contratti API, vincoli, ordinamenti, fallback, localizzazione e transizioni di stato**, non il markup React/Tailwind. In particolare:

1. gli stessi sei Paesi supportati (`IT`, `FR`, `ES`, `CH`, `SI`, `PL`);
2. le gerarchie geografiche variabili per Paese, senza assumere sempre Regione → Provincia → Comune;
3. gli stessi cataloghi sportivi e le stesse iscrizioni filtrate per Paese;
4. una sola iscrizione attiva principale per Club;
5. feed e profilo che leggono sport/categoria dall’iscrizione principale canonica;
6. cambio Paese del Club consentito, con archiviazione (non cancellazione) dei dati sportivi incompatibili;
7. stessi testi/localizzazioni visibili in italiano, inglese, francese e spagnolo;
8. stessi menu di ruolo sulle pagine legali per utenti autenticati;
9. stesso configuratore Sponsor geografico e stessa formula di preventivo;
10. stessi stati di caricamento, vuoto, errore, retry e reset.

## 2. Audit cronologico dei commit

### 2.1 Branch superiore — integrazione Francia (`a938894..0e61b65`)

| Commit    | Risultato funzionale                                                                | File principali da leggere                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `485448a` | Catalogo ufficiale Francia per iscrizioni Club; enti/categorie filtrabili per Paese | `supabase/migrations/20261218120000_france_club_registration_catalog.sql`, `app/api/sports/organization-memberships/route.ts`, `components/sports/OrganizationCategoryFields.tsx` |
| `820d30f` | Profilo Club passa alla geografia canonica e introduce RPC di scrittura             | `components/profiles/ProfileEditForm.tsx`, `app/api/profiles/me/residence/route.ts`, `supabase/migrations/20261219120000_club_canonical_geography.sql`                            |
| `2a06743` | Completezza profilo Club riconosce country/area canonici                            | `lib/profiles/completion.ts`                                                                                                                                                      |
| `57eef53` | Fallback owner-scoped per Preview quando la RPC non è ancora disponibile            | `lib/geo/clubGeographyWrite.server.ts`                                                                                                                                            |
| `85f9cd6` | Iscrizioni, palmarès ed esperienze passate vengono vincolati al Paese               | route `clubs/*`, route `profiles/me/experiences`, `CanonicalCountrySelect`, `OrganizationCategoryFields`                                                                          |
| `6a21082` | “Giovanili” viene localizzato e ordinato per ultimo                                 | `lib/i18n/controlledVocabulary.ts`, componenti Club/Opportunity                                                                                                                   |
| `8449605` | Sport nei risultati Search localizzato lato presentazione                           | `app/api/search/route.ts`, `components/search/SearchResultRow.tsx`                                                                                                                |
| `0dc432a` | Coerenza Paese applicata anche a iscrizioni e palmarès                              | migrazioni `20261218`, `20261219`, `20261220`                                                                                                                                     |
| `54a15f6` | Ordine corretto della validazione/scrittura geografica nel form                     | `components/profiles/ProfileEditForm.tsx`                                                                                                                                         |
| `95f751b` | La successiva PATCH del profilo non sovrascrive la geografia canonica               | `components/profiles/ProfileEditForm.tsx`                                                                                                                                         |
| `0e61b65` | Rimossi anche gli ultimi campi legacy stale dalla PATCH base                        | `components/profiles/ProfileEditForm.tsx`                                                                                                                                         |

### 2.2 Branch corrente — allineamento Feed e correzioni successive (`0e61b65..70f7079`)

| Commit    | Risultato funzionale                                                                    | File principali da leggere                                                |
| --------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `128ebcb` | `/api/profiles/me` proietta sport e categoria dall’iscrizione attiva principale         | `app/api/profiles/me/route.ts`, `components/profiles/ProfileMiniCard.tsx` |
| `afc13c9` | Il codice sport `football` viene mostrato come `Calcio` in italiano                     | `ProfileMiniCard.tsx`, `controlledVocabulary.ts`                          |
| `dede58c` | Sponsor multi-Paese; quattro documenti legali localizzati                               | `app/sponsor/page.tsx`, `components/legal/LocalizedLegalDocument.tsx`     |
| `5d98472` | Pagine legali autenticate usano il menu applicativo specifico del ruolo                 | `app/legal/layout.tsx`, `components/shell/AppShell.tsx`                   |
| `70f7079` | Cambio Paese Club sbloccato; record incompatibili archiviati; errori reali e refresh UI | migrazione `20261221120000`, writer Club, route residence, sezioni Club   |

## 3. Modello dati e migrazioni — obbligatorio prima della UI Mobile

Mobile non deve creare un database alternativo. Deve usare lo stesso backend e verificare che le migrazioni siano applicate **in ordine**:

1. `20261218120000_france_club_registration_catalog.sql`
2. `20261219120000_club_canonical_geography.sql`
3. `20261220120000_club_honors_country_coherence.sql`
4. `20261221120000_club_geography_reconcile_country_records.sql`

### 3.1 Catalogo Francia

La migrazione Francia crea/aggiorna:

- 11 organizzazioni sportive francesi autorizzate;
- 98 categorie complessive;
- copertura per calcio, calcio a 8, futsal, pallavolo, basket, pallamano, rugby, hockey ghiaccio, pallanuoto, hockey prato, baseball, softball, football americano e lacrosse;
- codici di visualizzazione: `FFF`, `FFvolley`, `FFBB`, `FFHandball`, `FFR`, `FFHG`, `FFN`, `FFH`, `FFBS`, `FFFA`, `France Lacrosse`;
- alias storico `Ligue 3`/`National` conservato nei metadata;
- `Giovanili` consolidato, senza duplicare fasce youth granulari.

**Regola Mobile:** non hardcodare queste 98 categorie. Leggerle dall’API, conservare gli UUID canonici e mostrare `canonical_name` localizzato quando il vocabolario lo riconosce.

### 3.2 Entità canoniche usate

- `countries`: Paesi attivi/supportati;
- `geo_areas`: gerarchia geografica canonica, con `country_id`, `parent_id`, `area_type`, `level`, `official_name`;
- `profile_preferences.residence_country_id` e `residence_geo_area_id`: sede canonica del Club;
- `club_sport_registrations`: iscrizioni sportive del Club;
- `club_honors`: palmarès;
- `sports_organizations` e `sports_organization_categories`: enti e categorie canoniche.

### 3.3 Vincoli invarianti

- una categoria deve corrispondere esattamente a Paese, sport, disciplina, variante e organizzazione;
- al massimo una registrazione per Club può essere `is_active = true AND is_primary = true`;
- gli honors devono essere coerenti col Paese e col contesto sportivo;
- gli UUID canonici sono identità persistite; le label sono soltanto presentazione;
- la nazione legacy in `profiles.country` non è la fonte autorevole quando esiste `profile_preferences.residence_country_id`.

### 3.4 Cambio Paese del Club (comportamento finale)

La RPC finale è `public.update_my_club_geography(p_residence_country_id, p_residence_geo_area_id)`.

Sequenza atomica:

1. deriva l’utente da `auth.uid()`; non accetta un `profileId` dal client;
2. verifica profilo unico e ruolo Club;
3. valida Paese supportato/attivo;
4. archivia le `club_sport_registrations` attive del vecchio Paese impostando `is_active=false`, `is_primary=false`;
5. archivia i `club_honors` attivi incompatibili impostando `is_active=false`;
6. valida area, Paese e intera catena degli antenati (massimo 16 livelli, no cicli);
7. proietta i nomi legacy `region`, `province`, `city`; per Italia proietta anche gli ID legacy;
8. aggiorna `profiles` e fa upsert di `profile_preferences`;
9. restituisce JSON con `profileId`, `source`, country/area ID e `legacyResidence`.

**Impatto UX Mobile:** dopo uno spostamento internazionale riuscito, mostrare il salvataggio riuscito, ricaricare Iscrizioni e Palmarès, e informare che le vecchie voci sono archiviate e che va creata una nuova iscrizione principale valida per il nuovo Paese. Non mostrare le righe archiviate nelle liste attive.

## 4. Contratti API da replicare/consumare

### 4.1 Geografia canonica

- `GET /api/geo/countries` → soli Paesi supportati/attivi, ordinati;
- `GET /api/geo/areas?country=<ISO2>` → radici del Paese;
- `GET /api/geo/areas?country=<ISO2>&parentId=<UUID>` → figli diretti;
- `GET /api/geo/areas/<UUID>/ancestors` → `{ area, ancestors }`;
- `GET /api/profiles/me/residence` → `{ enabled, writable, residence }`;
- `PATCH /api/profiles/me/residence` body:

```json
{
  "geography": {
    "residenceCountryId": "uuid-country",
    "residenceGeoAreaId": "uuid-deepest-selected-area"
  }
}
```

Per Club la scrittura è sempre abilitata. I gate/canary restano applicabili soltanto a Player/Staff.

### 4.2 Catalogo organizzazioni/categorie

`GET /api/sports/organization-memberships?countryId=<UUID>` restituisce:

```json
{
  "data": {
    "organizations": [
      {
        "id": "...",
        "code": "fff",
        "canonical_name": "...",
        "display_name": "FFF",
        "display_order": 1
      }
    ],
    "organizationCategories": [
      {
        "id": "...",
        "organization_id": "...",
        "country_id": "...",
        "sport_id": "...",
        "discipline_id": null,
        "variant_id": null,
        "code": "...",
        "canonical_name": "Ligue 3",
        "display_order": 3
      }
    ]
  }
}
```

Filtrare localmente le categorie sull’intera catena sportiva: `sport_id`, `discipline_id`, `variant_id`; poi filtrare gli enti agli `organization_id` realmente disponibili.

### 4.3 Iscrizioni Club

- `GET /api/clubs/registrations`: solo righe attive del Club corrente, primaria prima;
- `POST /api/clubs/registrations` per nuova iscrizione;
- `PATCH /api/clubs/registrations/<id>` per modifica/disattivazione.

Payload persistito:

```json
{
  "sport_id": "uuid",
  "sport_discipline_id": null,
  "sport_variant_id": null,
  "sports_organization_id": "uuid",
  "sports_organization_category_id": "uuid",
  "is_primary": true,
  "is_active": true
}
```

Quando si rende primaria una riga, la precedente perde automaticamente `is_primary`. Non consentire la disattivazione dell’unica primaria senza una sostituta, tranne nel flusso atomico di cambio Paese gestito dal server.

### 4.4 Palmarès

- `GET /api/clubs/honors`;
- `POST /api/clubs/honors`;
- `PATCH /api/clubs/honors/<id>`.

Usa lo stesso contesto canonico dell’iscrizione, oltre a `season` (`YYYY/YYYY`) e `placement` (`1`, `2`, `3`). Le stagioni sono generate da `lib/clubs/honorSeasons.ts`; primo posto = label localizzata “Campione”.

### 4.5 Profilo corrente e Feed

`GET /api/profiles/me`, per un Club, sovrascrive nella risposta i campi legacy di riepilogo con la registrazione `is_active=true AND is_primary=true`:

- `sport` ← `sports.code` (fallback `sports.canonical_name`);
- `club_league_category` ← `category.canonical_name`.

**Regola Mobile:** usare questi valori già proiettati per la mini-card. Non rileggerli da campi cache locali, non scegliere la prima iscrizione non ordinata e non mostrare il codice tecnico grezzo.

Esempio italiano:

- dato API: `sport = "football"`;
- label Mobile: `localizeSport("football", "it") = "Calcio"`;
- categoria `Ligue 3` resta `Ligue 3` perché non è una voce generica traducibile;
- `Giovanili` passa dal vocabolario: IT `Giovanili`, EN `Youth`, FR `Jeunes`, ES `Categorías juveniles`.

## 5. UI/UX Mobile — flussi passo passo

### 5.1 Modifica profilo Club

1. Al mount, caricare profilo e `/api/profiles/me/residence`.
2. Inizializzare il selettore con `residenceCountryId` e `residenceGeoAreaId`.
3. Caricare i sei Paesi dall’API; visualizzarne il nome con `Intl.DisplayNames` o equivalente nativo per la lingua corrente.
4. Dopo il Paese, caricare dinamicamente le radici; dopo ogni scelta, caricare i figli.
5. Ricostruire una selezione già salvata usando `/ancestors`.
6. Non imporre una profondità fissa:
   - Francia: Région → Département → Commune;
   - Spagna: Comunidad Autónoma → Provincia → Municipio;
   - Svizzera: Canton → [District opzionale] → Municipality;
   - Slovenia: Statistical Region → Municipality;
   - Polonia: Voivodeship → Powiat → Gmina;
   - Italia: Regione → Provincia → Comune.
7. Rendere obbligatori Paese e area più profonda richiesta dalla UI.
8. Marcare `residenceDirty` solo dopo una modifica utente.
9. In salvataggio, inviare **prima** PATCH residence.
10. Solo dopo successo inviare PATCH `/api/profiles/me` per gli altri dati.
11. Nella PATCH base Club escludere tutti i campi geografici legacy per evitare overwrite stale:
    `region`, `province`, `city`, i tre `residence_*_id`, i tre `interest_*` testuali e i tre `interest_*_id`.
12. Ricaricare profilo, Iscrizioni e Palmarès dopo successo.
13. Se l’API fallisce, mostrare `error` restituito dal server, non una stringa generica.

### 5.2 Iscrizioni

Ordine dei controlli:

1. Sport canonico;
2. Ente/Federazione filtrato per Paese + sport;
3. Categoria/Competizione filtrata per Paese + catena sportiva + ente;
4. toggle “Principale”.

Comportamenti:

- cambiando Paese o Sport, azzerare ente e categoria stale;
- nuova prima iscrizione: primaria di default;
- richiedere conferma prima di sostituire la primaria;
- `Giovanili` sempre in fondo all’elenco;
- visualizzare `Sport · Ente · Categoria`, con badge “Principale”;
- dopo cambio Paese, ricaricare dal server (equivalente Mobile dell’evento Web `club-geography-updated`).

### 5.3 Esperienze passate Player/Staff

Il flusso completo è:

`Paese → Sport → Ente → Categoria → Ruolo`

- Paese necessario se viene scelta un’iscrizione canonica;
- ente e categoria devono essere entrambi valorizzati o entrambi vuoti;
- è consentito il fallback esplicito senza membership;
- inviare `countryId`, `organizationId`, `categoryId` e `primarySport` completo;
- cambiare Paese/Sport deve eliminare selezioni dipendenti non più valide.

### 5.4 Search

- la route Search restituisce il contesto canonico quando disponibile;
- localizzare lo sport in presentazione con il vocabolario controllato;
- non mutare il valore persistito;
- mantenere il fallback legacy per record precedenti al backfill.

### 5.5 Feed Club

Mini-card Club:

- nome/logo/geografia/motto/anno come Web;
- sport e categoria dall’iscrizione primaria proiettata da `/api/profiles/me`;
- tradurre sport e categorie controllate in base alla lingua corrente;
- per `football` in italiano mostrare **Calcio**, mai `football` o `Football`.

### 5.6 Sponsor

Usare la stessa cascata canonica e i sei Paesi. Non utilizzare le vecchie tabelle italiane `regions/provinces/municipalities` direttamente.

Formula Web da replicare:

- base 30 giorni: Starter €149, Growth €249, Performance €399;
- durata: 30 = `1`, 60 = `1.75`, 90 = `2.45`;
- copertura: nazionale `1`, primo livello `0.8`, intermedio `0.65`, locale `0.58`;
- esclusiva categoria: `1.4`;
- totale visualizzato: arrotondato all’euro, formattato nella locale corrente.

Il riepilogo inviato al lead deve includere pacchetto, posizionamenti, target, gerarchia scelta, durata, esclusiva e stima.

### 5.7 Pagine legali

Route da replicare:

- `/legal/privacy`
- `/legal/terms`
- `/legal/beta`
- `/legal/child-safety`

La copia visibile autorevole è in `components/legal/LocalizedLegalDocument.tsx`, per `it`, `en`, `fr`, `es`. Mobile deve replicare **testo e struttura correnti**, inclusa data formattata nella locale e contatti email.

Navigazione:

- utente anonimo: menu marketing/pubblico;
- autenticato: stesso menu del resto dell’app, derivato dal ruolo;
- ruoli riconosciuti: Club, Institution/Ente, Athlete/Player, Staff, Fan (e Admin se presente);
- non creare un menu legale separato con “+ Nuova opportunità” e “Logout”.

## 6. Localizzazione

Fonti Web:

- `lib/i18n/controlledVocabulary.ts`;
- `lib/i18n/messages/vocabulary/{it,en,fr,es}.ts`;
- `lib/i18n/messages/operations/{it,en,fr,es}.ts`;
- `lib/i18n/messages/sponsor/{it,en,fr,es}.ts`;
- `components/legal/LocalizedLegalDocument.tsx`.

Regole:

1. persistito/API = codice o nome canonico;
2. UI = traduzione in locale;
3. fallback = valore canonico originale, mai stringa vuota;
4. nomi geografici ufficiali restano `official_name`; solo il nome Paese viene localizzato;
5. label tipi area devono riflettere il tipo reale (`CANTON`, `POWIAT`, ecc.);
6. il cambio lingua deve aggiornare subito Feed, Sponsor, Legal e label controllate.

## 7. Error handling e stati

Mobile deve distinguere:

- errore HTTP/DB reale: mostrare il campo `error` dell’envelope;
- catalogo vuoto: stato vuoto, non errore;
- gerarchia incoerente/cross-country: bloccare il salvataggio;
- funzione RPC assente in Preview (`PGRST202` o PostgreSQL `42883`): il Web usa fallback owner-scoped;
- altri errori RPC: non fare fallback silenzioso;
- rete cancellata durante cambio selezione: ignorare la risposta obsoleta/cancellata;
- nuova selezione padre: troncare tutti i discendenti.

## 8. Sicurezza

- non inviare mai `profileId` alla RPC geografica; ownership da sessione;
- non usare service-role nel client Mobile;
- tutte le scritture passano da API autenticate/RLS;
- non permettere categorie cross-country anche se presenti in cache;
- non riattivare record archiviati del vecchio Paese cambiando soltanto `is_active`;
- il fallback Web è owner-scoped e va considerato comportamento server, non da duplicare nel client;
- non memorizzare label come sostituti degli UUID canonici.

## 9. Strategia cache e sincronizzazione Mobile

Chiavi cache consigliate:

- countries: globale + locale solo per label visualizzata;
- geo roots: `iso2`;
- geo children: `iso2 + parentId`;
- memberships: `countryId`;
- registrations/honors: `currentClubProfile`;
- profile summary: `currentProfile`.

Invalidazioni obbligatorie:

- cambio Paese → memberships, selezioni dipendenti;
- PATCH residence riuscita → profile, registrations, honors, feed mini-card;
- modifica primaria → registrations + profile summary + feed mini-card;
- cambio lingua → tutte le label derivate, non i dati canonici.

## 10. Piano operativo per Codex Mobile

### Fase A — ricognizione

- [ ] checkout/lettura del Web a commit `70f7079` o discendente;
- [ ] mappare client HTTP, store profilo, navigator e sistema i18n Mobile;
- [ ] verificare che il backend target abbia le quattro migrazioni elencate;
- [ ] creare una matrice schermata Web ↔ schermata Mobile.

### Fase B — modelli e client API

- [ ] aggiungere modelli `CanonicalCountry`, `GeoArea`, `GeographyAncestry`;
- [ ] aggiungere modelli `ClubSportRegistration`, `SportsOrganization`, `SportsOrganizationCategory`, `ClubHonor`;
- [ ] implementare endpoint geografia e membership;
- [ ] preservare UUID/null shape senza trasformazioni distruttive;
- [ ] implementare envelope/error parsing.

### Fase C — selettore geografico riusabile

- [ ] creare un solo componente/state machine riusabile;
- [ ] caricare livelli progressivi e supportare profondità variabile;
- [ ] idratare valori esistenti via ancestors;
- [ ] implementare abort/cancellation e retry;
- [ ] localizzare Paese e tipi area.

### Fase D — profilo Club

- [ ] sostituire qualsiasi selettore Italy-only;
- [ ] implementare ordine PATCH residence → PATCH base;
- [ ] escludere geography legacy dalla PATCH base;
- [ ] invalidare registrazioni/honors/feed dopo save;
- [ ] mostrare il messaggio server reale;
- [ ] mostrare nota di archiviazione quando cambia Paese.

### Fase E — iscrizioni, palmarès, esperienze

- [ ] cascata country-aware per iscrizioni e palmarès;
- [ ] primaria unica e conferme;
- [ ] localizzazione e ordinamento Giovanili;
- [ ] esperienze Player/Staff con flusso Paese → Sport → Ente → Categoria → Ruolo;
- [ ] testare tutti i sei Paesi.

### Fase F — Feed e Search

- [ ] consumare la proiezione primaria da `/api/profiles/me`;
- [ ] localizzare `football` → `Calcio` in italiano;
- [ ] localizzare categorie controllate;
- [ ] mantenere fallback legacy Search.

### Fase G — Sponsor e Legal

- [ ] Sponsor con cascata canonica, pricing identico e summary identico;
- [ ] copiare le quattro varianti locali dei quattro documenti legali;
- [ ] usare menu specifico del ruolo se autenticato e menu pubblico se anonimo.

### Fase H — certificazione 1:1

Test minimi per ogni piattaforma Mobile:

- [ ] selezione completa per IT, FR, ES, CH con e senza District, SI, PL;
- [ ] cambio Francia → Spagna con iscrizione FFF: salvataggio riesce, FFF sparisce dalle attive, storico non cancellato;
- [ ] creazione nuova iscrizione spagnola primaria;
- [ ] Feed mostra la nuova primaria;
- [ ] lingua italiana mostra `Calcio`, non `football`;
- [ ] Giovanili corretto in quattro lingue;
- [ ] Sponsor mostra sei Paesi e livelli corretti;
- [ ] quattro pagine Legal cambiano lingua live;
- [ ] menu Legal corretto per Club, Ente, Player, Staff e Fan;
- [ ] errori cross-country e offline leggibili;
- [ ] logout/login non conserva cache del Club precedente.

## 11. Test Web come specifica eseguibile

Mobile deve leggere questi test come acceptance criteria:

- `tests/unit/france-club-registration-catalog.test.ts`
- `tests/unit/club-canonical-geography.test.ts`
- `tests/unit/profile-completion.test.ts`
- `tests/unit/past-experience-membership.test.ts`
- `tests/unit/club-honors.test.ts`
- `tests/unit/search-result-localization.test.ts`
- `tests/unit/club-primary-registration-profile-card.test.ts`
- `tests/unit/sponsor-canonical-geography-and-legal-i18n.test.ts`
- `tests/integration/sql/club-organization-membership-tests.sql`

Comando di certificazione Web:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
```

## 12. File autorevoli da aprire, in ordine

1. `CODEX_MOBILE_FRANCE_AND_FEED_PARITY_AUDIT.md` (questo documento)
2. `supabase/migrations/20261218120000_france_club_registration_catalog.sql`
3. `supabase/migrations/20261219120000_club_canonical_geography.sql`
4. `supabase/migrations/20261220120000_club_honors_country_coherence.sql`
5. `supabase/migrations/20261221120000_club_geography_reconcile_country_records.sql`
6. `components/geo/CanonicalGeographySelector.tsx`
7. `components/geo/canonicalGeographySelectorModel.ts`
8. `components/geo/canonicalGeographyContracts.ts`
9. `components/profiles/ProfileEditForm.tsx`
10. `app/api/profiles/me/residence/route.ts`
11. `lib/geo/clubGeographyWrite.server.ts`
12. `components/clubs/ClubRegistrationsSection.tsx`
13. `components/clubs/ClubHonorsSection.tsx`
14. `components/sports/OrganizationCategoryFields.tsx`
15. `app/api/profiles/me/route.ts`
16. `components/profiles/ProfileMiniCard.tsx`
17. `app/sponsor/page.tsx`
18. `components/legal/LocalizedLegalDocument.tsx`
19. `app/legal/layout.tsx`
20. i test della sezione 11.

## 13. Definition of Done Mobile

La parity non è completa finché:

- tutte le schermate e i flussi della matrice sono implementati su Android e iOS;
- nessun flusso usa liste geografiche Italy-only;
- nessuna card mostra codici canonici non localizzati;
- il cambio Paese non produce `Canonical residence write failed` e non perde lo storico;
- Feed, profilo, iscrizioni e palmarès convergono dopo ogni mutation senza riavvio app;
- Sponsor e Legal sono completi nelle quattro lingue;
- ruolo e sessione determinano sempre il menu corretto;
- test unitari, integrazione API e smoke test manuali passano su entrambe le piattaforme;
- le differenze intenzionali native (layout, componenti OS) sono documentate, ma i comportamenti restano equivalenti.
