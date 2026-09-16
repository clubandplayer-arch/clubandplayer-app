# Club and Player — handoff unificato Web → Mobile

## Francia, Feed, geografia Club e cataloghi sportivi a sei Paesi

**Data revisione:** 16 settembre 2026  
**Destinatario:** Codex Mobile  
**Repository autorevole:** `clubandplayer-app` (Web)  
**Obiettivo:** parity funzionale e contrattuale Android/iOS 1:1, non semplice somiglianza visiva.

---

## 0. Come usare questo documento

Questo documento sostituisce il precedente handoff limitato a Francia e Feed e vi aggiunge
integralmente il lavoro del branch:

- `codex/implementa-integrazione-francia-secondo-documentazione`;
- `codex/allinea-valori-iscrizioni-e-feed`;
- `codex/implementa-cataloghi-paese-dalla-cartella-upload`.

Il precedente handoff indicava come baseline Web `70f7079` (o un discendente) e come commit
documentale `0fee6b8`. Il checkout nel quale viene prodotto questo aggiornamento contiene il
lavoro multi-Paese nel commit `04926fa`. I due oggetti storici `70f7079` e `0fee6b8` non sono
presenti nell'object database locale di questo checkout: i loro dettagli riportati nelle sezioni
"Francia/Feed/Geografia Club" derivano dall'handoff fornito dal product owner e vanno verificati
sui due branch Web originali prima di implementare Mobile.

La baseline funzionale da riprodurre è l'**unione** dei tre branch, risolta con queste precedenze:

1. codice server e migrazioni più recenti;
2. test Web più recenti;
3. cataloghi chiusi in `upload-nation-league/`, sezione 5;
4. questo documento;
5. il vecchio audit, solo dove non contraddice i punti 1-4.

> **Correzione vincolante:** il vecchio conteggio Francia di **98 categorie non è più valido**.
> La revisione corrente autorizza **71 combinazioni Francia**. Non implementare o ripristinare
> professionisti e categorie escluse dal vecchio documento.

---

## 1. Principi non negoziabili

1. Mobile usa gli endpoint autenticati Web; non scrive direttamente le tabelle per simulare flussi.
2. Mobile non usa `service_role`.
3. Mobile non invia `profileId` a RPC che derivano l'owner da `auth.uid()`.
4. RLS, ownership e validazione server restano l'autorità finale.
5. Gli UUID canonici non vanno rigenerati o sostituiti nel client.
6. Una scelta nascosta nella UI non equivale a validazione: il server deve poterla rifiutare.
7. I riferimenti storici non si cancellano: si archiviano/disattivano.
8. Paese, cittadinanza, lingua, residenza e Paesi di interesse sono concetti distinti.
9. Baseball e Softball sono distinti.
10. Calcio, Calcio a 6, Calcio a 7, Calcio a 8 e Futsal sono distinti.
11. Unihockey è alias di Floorball, non una seconda disciplina.
12. Sci, Biathlon e Tennis non devono apparire nei selettori applicativi.
13. "Giovanili" è una sola opzione per ambito Sport + Ente quando prevista dal catalogo.
14. Le Opportunity conservano snapshot e riferimenti storici anche se un'iscrizione viene disattivata.
15. L'iscrizione principale è unica fra quelle attive.
16. La principale è la proiezione preferita nel profilo e nel Feed.
17. Gli errori server reali vanno mostrati; non sostituirli sempre con un messaggio generico.
18. Cache e query Mobile vanno invalidate dopo ogni mutazione riuscita.
19. La profondità geografica varia per Paese: non codificare Regione → Provincia → Comune.
20. IT/EN/FR/ES devono restare allineati per chiavi, placeholder e valori controllati.

---

## 2. Matrice Paesi e geografia canonica

| Paese    | ISO2 | Gerarchia tipica                           | Nota Mobile                                     |
| -------- | ---- | ------------------------------------------ | ----------------------------------------------- |
| Italia   | IT   | Regione → Provincia → Comune               | Conservare compatibilità legacy italiana        |
| Francia  | FR   | Région → Département → Commune             | Non chiamare Province un Département            |
| Spagna   | ES   | Comunidad Autónoma → Provincia → Municipio | Profondità variabile gestita dal catalogo       |
| Svizzera | CH   | Cantone → Distretto opzionale → Comune     | Un Comune può essere figlio diretto del Cantone |
| Slovenia | SI   | Regione statistica → Comune                | Non inventare livelli MNZ geografici            |
| Polonia  | PL   | Voivodato → Powiat → Gmina                 | Conservare nomi ufficiali                       |

### Contratto selector

Mobile deve trattare il selector geografico come una catena canonica:

```ts
{
  countryId: string | null;
  geoAreaId: string | null;
}
```

Regole:

- cambio Paese azzera sempre l'area;
- cambio livello padre tronca tutti i discendenti;
- `geoAreaId` senza `countryId` è invalido;
- area e Paese devono coincidere lato server;
- il reset è esplicito e distinto dall'assenza del campo;
- un errore di catalogo non autorizza il fallback implicito a Italia.

### Endpoint geografici autorevoli

- `GET /api/geo/countries`
- `GET /api/geo/areas?country=<ISO2>`
- `GET /api/geo/areas?country=<ISO2>&parentId=<UUID>`
- `GET /api/geo/areas/<UUID>/ancestors`

Il client deve mostrare loading, errore, retry, empty state e reset.

---

## 3. Cambio Paese del Club (lavoro Francia/Feed)

Questa sezione riporta il comportamento richiesto dal precedente audit. Prima della replica Mobile,
aprire sui branch Web originali:

- `app/api/profiles/me/residence/route.ts`;
- `app/api/profiles/me/route.ts`;
- `lib/geo/clubGeographyWrite.server.ts`;
- `supabase/migrations/20261221120000_club_geography_reconcile_country_records.sql`;
- `tests/unit/club-canonical-geography.test.ts`.

### Flusso atteso

1. Il Club apre Modifica profilo.
2. Mobile carica geografia canonica e profilo corrente.
3. Il Club sceglie il nuovo Paese e la catena geografica ammessa.
4. Mobile invia il comando all'endpoint autenticato; non scrive `profiles` direttamente.
5. Il server deriva il Club da `auth.uid()`.
6. Il server valida Paese supportato, area e antenati.
7. Il server individua iscrizioni e palmarès incompatibili con il nuovo Paese.
8. Il server archivia atomicamente i record incompatibili; non li elimina.
9. Il server aggiorna proiezione canonica e fallback legacy.
10. Il server aggiorna le preferenze geografiche previste dal contratto.
11. Mobile, solo dopo successo, invalida:
    - profilo Club;
    - iscrizioni;
    - palmarès;
    - profilo pubblico;
    - mini-card Feed;
    - eventuali Opportunity editor aperti.
12. In caso di errore non va applicato uno stato ottimistico parziale.

### Error handling

- `401`: sessione assente/scaduta;
- `403`: owner/ruolo non ammesso;
- `400`: catena geografica o payload incompatibile;
- `409` o errore transazionale: mostrare il messaggio server e ricaricare lo snapshot;
- `5xx`: mantenere lo stato precedente, offrire retry.

---

## 4. Tassonomia Sport corrente

### Ordine visibile vincolante

1. Calcio
2. Calcio a 8
3. Calcio a 7
4. Calcio a 6
5. Futsal
6. Pallavolo
7. Pallacanestro
8. Pallanuoto
9. Pallamano
10. Rugby
11. Hockey su prato
12. Hockey su ghiaccio
13. Baseball
14. Softball
15. Lacrosse
16. Football americano
17. Floorball

Non mostrare:

- Sci;
- Biathlon;
- Tennis.

### Catena canonica

```ts
{
  sportId: string;
  disciplineId: string | null;
  variantId: string | null;
  legacySport: string;
}
```

Per Football:

- Calcio → `football / association_football / eleven_a_side`;
- Calcio a 8 → `football / association_football / eight_a_side`;
- Calcio a 7 → `football / association_football / seven_a_side`;
- Calcio a 6 → `football / association_football / six_a_side`;
- Futsal → `football / futsal / null`.

### Ruoli obbligatori aggiunti

**Calcio a 7 e Calcio a 6**

- Portiere
- Difensore
- Centrocampista
- Esterno offensivo/Ala
- Attaccante

**Floorball**

- Portiere
- Difensore
- Centro
- Ala
- Attaccante

I valori persistiti restano stabili; Mobile localizza soltanto la label.

### File Web autorevoli

- `lib/opps/constants.ts`
- `lib/i18n/controlledVocabulary.ts`
- `lib/i18n/messages/vocabulary/it.ts`
- `lib/i18n/messages/vocabulary/en.ts`
- `lib/i18n/messages/vocabulary/fr.ts`
- `lib/i18n/messages/vocabulary/es.ts`
- `components/sports/CanonicalSportFilter.tsx`

---

## 5. Cataloghi chiusi a sei Paesi

### Conteggi correnti selezionabili

| Paese                     |                 Combinazioni |     Sport |                    Enti |            Giovanili |
| ------------------------- | ---------------------------: | --------: | ----------------------: | -------------------: |
| IT                        | catalogo Italia preesistente | invariato | ordine Italia invariato | come catalogo Italia |
| FR                        |                           71 |        14 |                      11 |                    2 |
| ES                        |                           60 |        13 |                      11 |                    3 |
| CH                        |                           48 |         9 |                       8 |                    1 |
| SI                        |                           30 |        14 |                      12 |                    2 |
| PL                        |                           49 |        14 |                      12 |                    2 |
| Totale nuovi cinque Paesi |                          258 |         — |                       — |                   10 |

### Enti Francia (11)

1. FFF
2. FFvolley
3. FFBB
4. FFHandball
5. FFR
6. FFHG
7. FFN
8. FFH
9. FFBS
10. FFFA
11. France Lacrosse

### Correzione rispetto al vecchio audit

- Non usare 98 categorie Francia.
- Non importare National/Ligue 3 professionistica o semiprofessionistica dal vecchio catalogo.
- Non reintrodurre Arkema Première Ligue, Seconde Ligue o altre esclusioni.
- La migrazione disattiva vecchie opzioni FR senza cancellare UUID o riferimenti.

### Fonti di verità

- `upload-nation-league/upload-france.md`, solo sezione 5;
- `upload-nation-league/upload-spain.md`, solo sezione 5;
- `upload-nation-league/upload-switzerland.md`, solo sezione 5, esclusi Sci/Biathlon/Tennis per decisione prodotto successiva;
- `upload-nation-league/upload-slovenia.md`, solo sezione 5;
- `upload-nation-league/upload-poland.md`, solo sezione 5;
- `supabase/migrations/20261216120000_five_country_club_catalogs.sql`;
- `supabase/migrations/20261218120000_past_experience_country_and_retire_individual_sports.sql`;
- `supabase/migrations/20261219120000_retire_tennis_from_selectable_sports.sql`.

### Regole di rendering Mobile

- Non costruire prodotti cartesiani Sport × Ente × Categoria.
- Mostrare soltanto tuple restituite dal server.
- Filtrare prima per `countryId`, poi per catena Sport completa.
- Ordinare categorie con `display_order`.
- Mettere Giovanili in fondo al proprio gruppo.
- Non mostrare categorie `is_active=false` nelle nuove scelte.
- Continuare a visualizzare label storiche già referenziate.

---

## 6. Endpoint catalogo Ente/Categoria

### Request

```http
GET /api/sports/organization-memberships?countryId=<COUNTRY_UUID>
```

Se usato in un contesto esplicitamente country-scoped, Mobile deve sempre passare `countryId`.
Il fallback al Paese del profilo serve per compatibilità, non per le Esperienze passate estere.

### Response concettuale

```json
{
  "ok": true,
  "data": {
    "organizations": [
      {
        "id": "uuid",
        "code": "fr_fff",
        "canonical_name": "FFF",
        "organization_type": "federation",
        "display_order": 1,
        "display_name": "FFF"
      }
    ],
    "organizationCategories": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "country_id": "uuid",
        "sport_id": "uuid",
        "discipline_id": "uuid-or-null",
        "variant_id": "uuid-or-null",
        "code": "...",
        "canonical_name": "National 2",
        "display_order": 1
      }
    ]
  }
}
```

### Reset dipendenze

- cambio Sport → azzera Ente e Categoria;
- cambio Paese → azzera Ente e Categoria;
- cambio Ente → azzera Categoria;
- Paese non selezionato in un form country-scoped → Ente/Categoria disabilitati.

---

## 7. Iscrizioni multiple del Club

### Endpoint

- `GET /api/clubs/registrations`
- `POST /api/clubs/registrations`
- `PATCH /api/clubs/registrations/<registrationId>`
- `GET /api/clubs/<clubId>/registrations`

### GET owner

Restituisce:

```json
{
  "data": [
    {
      "id": "uuid",
      "club_profile_id": "uuid",
      "sport_id": "uuid",
      "sport_discipline_id": "uuid-or-null",
      "sport_variant_id": "uuid-or-null",
      "sports_organization_id": "uuid",
      "sports_organization_category_id": "uuid",
      "is_primary": true,
      "is_active": true,
      "sports": { "code": "football", "canonical_name": "Football" },
      "organization": { "code": "fr_fff", "canonical_name": "FFF" },
      "category": { "canonical_name": "National 2" },
      "legacy_sport": "Calcio"
    }
  ],
  "countryId": "uuid"
}
```

### Vincoli

- più iscrizioni attive sono ammesse;
- anche stesso sport con ente/categoria diversa è ammesso;
- duplicato della tupla completa è vietato;
- esiste al massimo una principale attiva;
- cambio principale deve essere atomico;
- non si disattiva l'unica principale senza scegliere un rimpiazzo;
- owner Club derivato da sessione;
- categoria, ente, Paese e catena Sport devono coincidere;
- record storici inattivi non vanno cancellati.

### Cache Mobile

Dopo POST/PATCH riuscita invalidare:

- `clubRegistrations(me)`;
- `clubProfile(me)`;
- `clubProfile(publicId)`;
- `feed` e mini-card interessate;
- editor Opportunity;
- palmarès se dipende dalla stessa iscrizione/catalogo.

---

## 8. Iscrizione principale e Feed

Il comportamento definitivo richiesto dal precedente audit è registration-first:

1. leggere iscrizioni attive ordinate `is_primary desc`, poi ordine stabile;
2. usare la prima principale per Sport, Ente e Categoria mostrati;
3. usare i vecchi campi profilo soltanto come fallback per record legacy;
4. localizzare `football` come "Calcio" in italiano;
5. non mostrare codici interni all'utente;
6. quando cambia la principale, aggiornare tutte le mini-card Feed interessate.

File da verificare sui branch Francia/Feed:

- `components/profiles/ProfileMiniCard.tsx`;
- `app/(dashboard)/clubs/[id]/page.tsx`;
- `components/profiles/ClubProfileDetails.tsx`;
- `tests/unit/club-primary-registration-profile-card.test.ts`;
- `tests/unit/france-club-registration-catalog.test.ts`.

---

## 9. Opportunity collegate alle iscrizioni

### Regola

Una Opportunity Club può scegliere una sola iscrizione attiva appartenente a quel Club.
La principale è il default UI, non un valore inventato lato server.

### Payload rilevante

```json
{
  "club_sport_registration_id": "uuid",
  "sport_id": "uuid",
  "sport_discipline_id": "uuid-or-null",
  "sport_variant_id": "uuid-or-null",
  "sports_organization_id": "uuid",
  "sports_organization_category_id": "uuid"
}
```

### Validazione

Il server controlla:

- ownership della registration;
- `is_active=true` per nuove Opportunity;
- uguaglianza di tutti i campi snapshot;
- coerenza Sport/Disciplina/Variante;
- Ente/Categoria;
- nessun riferimento a registration di un altro Club.

Le Opportunity già pubblicate mantengono il riferimento se in seguito l'iscrizione viene disattivata.
Non eliminare in cascata lo storico.

Endpoint:

- `GET /api/opportunities`
- `POST /api/opportunities`
- `GET /api/opportunities/<id>`
- `PATCH /api/opportunities/<id>`
- `DELETE /api/opportunities/<id>`

---

## 10. Palmarès Club

Endpoint:

- `GET /api/clubs/honors`
- `POST /api/clubs/honors`
- `PATCH /api/clubs/honors/<id>`
- `GET /api/clubs/<clubId>/honors`

Payload:

```json
{
  "season": "2025/2026",
  "placement": 1,
  "sport_id": "uuid",
  "sport_discipline_id": "uuid-or-null",
  "sport_variant_id": "uuid-or-null",
  "sports_organization_id": "uuid",
  "sports_organization_category_id": "uuid",
  "is_active": true
}
```

Regole:

- piazzamenti ammessi: 1, 2, 3;
- stagione nel formato richiesto dal Web;
- combinazione catalogo completa;
- owner Club;
- disattivazione logica, non cancellazione;
- ordine pubblico stabile per stagione, piazzamento, creazione, UUID;
- Giovanili resta in fondo nel selector.

Dopo il cambio Paese del Club, i palmarès incompatibili vengono archiviati atomicamente secondo
il contratto del branch Francia/Feed.

---

## 11. Esperienze passate Player/Staff

### Nuovo ordine vincolante

```text
Stagione → Club → Sport → Paese → Ente/Federazione → Categoria/Campionato → Ruolo
```

Il Paese dell'esperienza non è la residenza e non è la nazionalità.
Un Player residente in Italia può registrare un'esperienza in Francia.

### Endpoint

- `GET /api/profiles/me/experiences`
- `PATCH /api/profiles/me/experiences`

### Elemento PATCH

```json
{
  "season": "2025/26",
  "club": "Club Example",
  "countryId": "uuid-country-fr",
  "primarySport": {
    "canonical": {
      "sportId": "uuid",
      "disciplineId": "uuid-or-null",
      "variantId": "uuid-or-null"
    }
  },
  "organizationId": "uuid-or-empty",
  "categoryId": "uuid-or-empty",
  "category": "label compatibility",
  "role": "Portiere"
}
```

### Regole

- massimo 50 esperienze;
- Paese obbligatorio per ogni esperienza completa;
- Paese attivo e supportato;
- stagione valida;
- Club, Sport e Ruolo obbligatori;
- Ente e Categoria entrambi presenti oppure entrambi assenti;
- se presenti, devono coincidere con Paese e catena Sport;
- cambio Sport azzera Paese, Ente, Categoria e Ruolo dipendente;
- cambio Paese azzera Ente e Categoria;
- senza Paese, Ente e Categoria disabilitati;
- il fallback senza Ente/Categoria resta ammesso, ma non senza Paese;
- il server riscrive atomicamente la collezione dell'owner;
- esperienze storiche collegate a una categoria recuperano il Paese dalla categoria.

### File autorevoli

- `components/profiles/ProfileEditForm.tsx`
- `components/geo/CanonicalCountrySelect.tsx`
- `components/sports/OrganizationCategoryFields.tsx`
- `lib/profiles/pastExperiences.ts`
- `app/api/profiles/me/experiences/route.ts`
- `supabase/migrations/20261218120000_past_experience_country_and_retire_individual_sports.sql`

---

## 12. Search, Discover e mappe

Mobile deve riusare gli ID canonici e non tradurre le label in filtri server.

Requisiti:

- Search accetta Paese canonico e area opzionale;
- la stessa query deve produrre conteggio e risultati coerenti;
- sport canonico ha precedenza, legacy è fallback;
- Discover usa interessi del viewer, non quelli privati del target;
- chi non ha dati canonici non viene penalizzato automaticamente;
- mappe non fabbricano pin dai centroidi amministrativi;
- la posizione precisa di persone non diventa pubblica;
- Club usa sede/impianto pubblico validato;
- aree senza bounds usano il fallback testuale controllato lato server.

Dopo mutazioni geografiche invalidare Search/Discover solo dove il viewer o il soggetto è coinvolto.

---

## 13. Sponsor (contratto del branch Francia/Feed)

Verificare sui branch originali:

- `app/sponsor/page.tsx`;
- `lib/i18n/messages/sponsor/it.ts`;
- `lib/i18n/messages/sponsor/en.ts`;
- `lib/i18n/messages/sponsor/fr.ts`;
- `lib/i18n/messages/sponsor/es.ts`;
- `tests/unit/sponsor-canonical-geography-and-legal-i18n.test.ts`.

### Requisiti Mobile

- supportare IT, FR, ES, CH, SI, PL;
- usare geografia canonica con profondità variabile;
- replicare la formula Web esatta, senza ricalcolo divergente;
- durata, copertura, pacchetto ed esclusiva producono la stessa stima;
- esclusiva categoria applica lo stesso coefficiente Web;
- riepilogo preventivo incluso automaticamente nella richiesta;
- cooldown e validazione campi uguali al Web;
- testi localizzati IT/EN/FR/ES;
- prezzi indicativi restano soggetti a conferma.

Prima di codificare la formula, copiarla dai sorgenti Web del branch autorevole e aggiungere fixture
con input/output identici su Mobile.

---

## 14. Legal, lingua e navigazione ruolo

Pagine obbligatorie:

- Privacy;
- Terms;
- Beta;
- Child Safety.

Lingue:

- italiano;
- inglese;
- francese;
- spagnolo.

File del branch Francia/Feed:

- `app/legal/layout.tsx`;
- `app/legal/privacy/page.tsx`;
- `app/legal/terms/page.tsx`;
- `app/legal/beta/page.tsx`;
- `app/legal/child-safety/page.tsx`;
- `components/legal/LocalizedLegalDocument.tsx`.

Regole:

- nessuna pagina legale hardcoded in una sola lingua;
- stessa preferenza lingua del resto dell'app;
- stesso menu specifico del ruolo;
- link indietro coerente col contesto autenticato;
- fallback lingua deterministico;
- non tradurre nomi propri, acronimi o UUID.

---

## 15. Sicurezza e ownership

### Iscrizioni Club

- owner derivato dalla sessione;
- INSERT/PATCH solo per `account_type='club'` proprietario;
- lettura pubblica solo delle attive;
- owner può leggere le proprie inattive dove previsto;
- nessun hard delete client.

### Esperienze

- profilo derivato da `auth.uid()`;
- RPC `security invoker`;
- massimo 50;
- replacement atomico;
- country e membership validate due volte: API e DB.

### Opportunity

- registration appartiene al Club;
- snapshot completo coerente;
- nessun cross-club ID injection.

### Geografia Club

- RPC/servizio deriva owner;
- cambio Paese transazionale;
- archivia record incompatibili;
- nessuna scrittura parziale client-side.

### Logging Mobile

Non loggare:

- access token;
- refresh token;
- service key;
- payload completi con PII;
- email/telefono non mascherati;
- coordinate personali precise.

---

## 16. Localizzazione controllata

Mobile non deve usare il valore persistito come label quando esiste una chiave controllata.

Esempi:

| Persistito/canonico   | IT         | EN                    | FR           | ES          |
| --------------------- | ---------- | --------------------- | ------------ | ----------- |
| football / Calcio     | Calcio     | Football              | Football     | Fútbol      |
| Calcio a 8            | Calcio a 8 | Eight-a-side football | Football à 8 | Fútbol 8    |
| Calcio a 7            | Calcio a 7 | Seven-a-side football | Football à 7 | Fútbol 7    |
| Calcio a 6            | Calcio a 6 | Six-a-side football   | Football à 6 | Fútbol 6    |
| Futsal                | Futsal     | Futsal                | Futsal       | Fútbol sala |
| Floorball / Unihockey | Floorball  | Floorball             | Floorball    | Floorball   |
| Giovanili             | Giovanili  | Youth                 | Jeunes       | Juveniles   |

Regole:

- alias non diventano nuove opzioni;
- `Unihockey` si presenta come Floorball;
- gli acronimi federali restano riconoscibili;
- i nomi dei campionati restano canonici salvo traduzione esplicitamente prevista;
- placeholder interpolati devono avere parità fra lingue.

---

## 17. Strategia cache e invalidation Mobile

### Query key raccomandate

```text
countries
geoRoots(iso2)
geoChildren(iso2,parentId)
geoAncestors(areaId)
sportCatalog
organizationMemberships(countryId,sportId,disciplineId,variantId)
clubRegistrations(clubId|me)
clubHonors(clubId|me)
clubProfile(clubId|me)
athleteExperiences(me)
opportunity(id)
opportunities(filters)
feed(scope)
```

### Invalidazioni

| Mutazione                 | Invalidare                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| cambio Paese Club         | profilo, registrations, honors, feed, mappe, editor Opportunity                 |
| nuova/modifica iscrizione | registrations, profilo, feed, editor Opportunity                                |
| cambio principale         | registrations, profilo pubblico, mini-card Feed                                 |
| disattivazione iscrizione | registrations, profilo, editor Opportunity; non cancellare Opportunity storiche |
| palmarès                  | honors privato/pubblico, profilo Club                                           |
| esperienze                | athleteExperiences, profilo Player/Staff                                        |
| lingua                    | risorse i18n e rendering; non dati server canonici                              |

Non affidarsi solo all'aggiornamento ottimistico: dopo successo fare refetch della rappresentazione server.

---

## 18. Stato ed errori UI

Ogni selector asincrono deve avere:

- stato iniziale;
- loading;
- disabled per dipendenza mancante;
- empty state;
- errore con retry;
- selezione;
- reset;
- accessibilità/label;
- nessun fallback silenzioso cross-country.

Ogni form deve:

- impedire doppio submit;
- mostrare errore server;
- mantenere input in caso di errore;
- chiudersi solo dopo successo;
- refetch dopo salvataggio;
- chiedere conferma per cambio principale/disattivazione distruttiva dal punto di vista UX.

---

## 19. Piano operativo Codex Mobile (fasi A–H)

### Fase A — ricognizione e baseline

- [ ] Leggere integralmente questo documento.
- [ ] Aprire i tre branch Web indicati.
- [ ] Verificare commit `70f7079`, `0fee6b8` e `04926fa` o discendenti equivalenti.
- [ ] Inventariare modelli, client API, query cache e schermate Mobile esistenti.
- [ ] Mappare divergenze Web/Mobile senza ancora modificare UI.
- [ ] Registrare versioni backend/migrazioni disponibili nell'ambiente di test.

### Fase B — modelli e client API

- [ ] Aggiungere tipi Country/Sport/Discipline/Variant.
- [ ] Aggiungere Organization/Category country-scoped.
- [ ] Aggiungere ClubRegistration e ClubHonor.
- [ ] Aggiungere `countryId` alle PastExperience.
- [ ] Aggiungere `clubSportRegistrationId` alle Opportunity.
- [ ] Implementare client endpoint con errori tipizzati.
- [ ] Nessuna scrittura diretta Supabase che aggiri endpoint/RPC.

### Fase C — geografia a sei Paesi

- [ ] Country selector canonico.
- [ ] Livelli dinamici.
- [ ] Supporto CH senza Distretto.
- [ ] Reset dipendenze.
- [ ] Retry/error/empty.
- [ ] Test unitari per le sei gerarchie.
- [ ] Test Android/iOS per tastiera, picker e back navigation.

### Fase D — catalogo Sport/Ente/Categoria

- [ ] Ordine Sport vincolante.
- [ ] Rimuovere Sci, Biathlon, Tennis.
- [ ] Aggiungere ruoli Calcio 6/7 e Floorball.
- [ ] Fetch Ente/Categoria per `countryId` + catena Sport.
- [ ] Giovanili in fondo.
- [ ] Nessun prodotto cartesiano.
- [ ] Visualizzazione storica delle righe inattive già referenziate.

### Fase E — Club

- [ ] Cambio Paese transazionale tramite endpoint.
- [ ] Iscrizioni multiple.
- [ ] Principale unica.
- [ ] Disattivazione con rimpiazzo.
- [ ] Palmarès.
- [ ] Profilo pubblico registration-first.
- [ ] Refresh mini-card Feed.
- [ ] Archiviazione record incompatibili al cambio Paese.

### Fase F — Player/Staff e Opportunity

- [ ] Esperienze: Sport → Paese → Ente → Categoria → Ruolo.
- [ ] Paese esperienza indipendente da residenza.
- [ ] Opportunity default sulla principale.
- [ ] Validare registration ownership e snapshot.
- [ ] Conservare Opportunity storiche.
- [ ] Search e Discover canonici.

### Fase G — Sponsor, Legal, lingua e navigazione

- [ ] Formula Sponsor identica con golden tests.
- [ ] Sei Paesi nel configuratore.
- [ ] Legal IT/EN/FR/ES.
- [ ] Menu dipendente dal ruolo.
- [ ] Cambio lingua senza perdita di stato.
- [ ] Error copy e placeholder parity.

### Fase H — certificazione 1:1

- [ ] Test unitari modelli e reducer.
- [ ] Test client API request/response/error.
- [ ] Test cache invalidation.
- [ ] Test UI Android.
- [ ] Test UI iOS.
- [ ] Test offline/retry/sessione scaduta.
- [ ] Test ownership negativo.
- [ ] Test cross-country negativo.
- [ ] Test storico inattivo.
- [ ] Test localizzazione quattro lingue.
- [ ] Test snapshot Opportunity.
- [ ] Test Feed dopo cambio principale e cambio Paese.
- [ ] Compilare tabella divergenze native intenzionali.

---

## 20. Matrice di acceptance test Mobile

### Cataloghi

1. FR/Calcio/FFF mostra 8 categorie attive incluse Giovanili.
2. FR/Futsal non mostra D1 Futsal.
3. ES mostra solo i 60 record autorizzati.
4. CH non mostra Sci, Biathlon o Tennis.
5. CH mostra Floorball/swiss unihockey.
6. CH e SI espongono Calcio a 7 solo nei rispettivi ambiti autorizzati.
7. PL espone Calcio a 6/Playarena-Socca.
8. IT mantiene ordine enti preesistente.
9. Categoria omonima in due Paesi produce UUID/ambiti distinti.
10. Giovanili appare in fondo.

### Iscrizioni

11. Club può avere due iscrizioni nello stesso sport con categorie diverse.
12. Duplicato esatto fallisce.
13. Seconda principale demuove atomicamente la precedente.
14. Disattivazione unica principale senza rimpiazzo fallisce.
15. Categoria FR inviata per Club IT fallisce.
16. ID categoria alterato manualmente fallisce.
17. Altro Club non può modificare l'iscrizione.
18. Profilo pubblico mostra principale per prima.

### Esperienze

19. Sport scelto abilita Paese.
20. Senza Paese, Ente e Categoria restano disabilitati.
21. Paese FR mostra FFF e non LND.
22. Cambio FR → IT azzera FFF e categoria.
23. Esperienza senza Ente/Categoria ma con Paese è valida.
24. Esperienza senza Paese è invalida.
25. CountryId non supportato fallisce.
26. Categoria cross-country fallisce API e RPC.
27. Max 50 esperienze.
28. Lettura restituisce il Paese persistito.

### Opportunity e Feed

29. Nuova Opportunity preseleziona principale.
30. Registration di altro Club fallisce.
31. Snapshot incoerente fallisce.
32. Disattivazione successiva non rompe dettaglio storico.
33. Cambio principale aggiorna mini-card Feed dopo invalidazione.
34. In italiano appare Calcio, non football.
35. Giovanili è localizzato.

### Geografia Club

36. Cambio Paese con area incoerente fallisce senza stato parziale.
37. Cambio riuscito archivia record incompatibili.
38. Record storici restano fisicamente presenti.
39. Cache profilo/iscrizioni/palmarès/feed viene invalidata.
40. CH Comune diretto sotto Cantone funziona.

### Sponsor/Legal

41. Stesso input Sponsor Web/Mobile → stessa stima.
42. Esclusiva applica identico coefficiente.
43. Tutti i sei Paesi selezionabili.
44. Quattro documenti legali in quattro lingue.
45. Menu legale coerente col ruolo.

---

## 21. Test Web come specifica eseguibile

### Cataloghi e membership

- `tests/unit/five-country-club-catalogs.test.ts`
- `tests/unit/reduced-football-floorball-roles.test.ts`
- `tests/unit/phase-6-club-organization-membership.test.ts`
- `tests/unit/club-honors.test.ts`
- `tests/integration/sql/club-organization-membership-tests.sql`

### Esperienze

- `tests/unit/past-experience-membership.test.ts`
- `tests/integration/sql/athlete-experience-sport-runtime-tests.sql`
- `tests/integration/sql/athlete-experience-sport-runtime-setup.sql`

### Opportunity

- `tests/unit/opportunity-registration-review-remediation.test.ts`
- `tests/unit/opportunity-geography-dual-read-write.test.ts`
- `tests/unit/opportunity-form-canonical-geography.test.ts`
- `tests/integration/sql/opportunity-canonical-sports-runtime-tests.sql`

### Geografia

- `tests/unit/canonical-geography-read-contracts.test.ts`
- `tests/unit/canonical-geography-selector.test.ts`
- `tests/unit/profile-residence-write-contract.test.ts`
- `tests/unit/maps-geography-contract.test.ts`
- `tests/unit/maps-server-boundary.test.ts`

### Localizzazione

- `tests/unit/controlled-vocabulary.test.ts`
- `tests/unit/i18n.test.ts`
- `tests/unit/phase-5d-c-review-remediation.test.ts`

### Test aggiunti nel branch Francia/Feed da aprire lì

- `tests/unit/club-canonical-geography.test.ts`
- `tests/unit/club-primary-registration-profile-card.test.ts`
- `tests/unit/france-club-registration-catalog.test.ts`
- `tests/unit/sponsor-canonical-geography-and-legal-i18n.test.ts`

Mobile deve trasformare questi test in acceptance criteria nativi, non limitarsi a verificare che le
schermate esistano.

---

## 22. File autorevoli da aprire, in ordine

### Gruppo 1 — fondazioni

1. `supabase/migrations/20260822120000_european_catalog_foundation.sql`
2. `supabase/migrations/20261206120000_canonical_sports_competition_schema.sql`
3. `supabase/migrations/20261212120000_sports_organization_categories.sql`
4. `supabase/migrations/20261215120000_club_sport_registrations_reconciliation.sql`
5. `lib/taxonomy/canonicalSportFormPayload.ts`
6. `lib/taxonomy/canonicalSportSelector.ts`

### Gruppo 2 — cataloghi nuovi

7. `upload-nation-league/upload-france.md`
8. `upload-nation-league/upload-spain.md`
9. `upload-nation-league/upload-switzerland.md`
10. `upload-nation-league/upload-slovenia.md`
11. `upload-nation-league/upload-poland.md`
12. `supabase/migrations/20261216120000_five_country_club_catalogs.sql`
13. `supabase/migrations/20261218120000_past_experience_country_and_retire_individual_sports.sql`
14. `supabase/migrations/20261219120000_retire_tennis_from_selectable_sports.sql`

### Gruppo 3 — API/catalog selector

15. `app/api/sports/catalog/route.ts`
16. `app/api/sports/organization-memberships/route.ts`
17. `lib/sports/organizationMembership.server.ts`
18. `components/sports/CanonicalSportFilter.tsx`
19. `components/sports/OrganizationCategoryFields.tsx`
20. `components/geo/CanonicalCountrySelect.tsx`

### Gruppo 4 — Club

21. `app/api/clubs/registrations/route.ts`
22. `app/api/clubs/registrations/[id]/route.ts`
23. `app/api/clubs/[id]/registrations/route.ts`
24. `components/clubs/ClubRegistrationsSection.tsx`
25. `app/api/clubs/honors/route.ts`
26. `app/api/clubs/honors/[id]/route.ts`
27. `components/clubs/ClubHonorsSection.tsx`
28. `app/(dashboard)/clubs/[id]/page.tsx`

### Gruppo 5 — Player/Staff

29. `lib/profiles/pastExperiences.ts`
30. `app/api/profiles/me/experiences/route.ts`
31. `components/profiles/ProfileEditForm.tsx`

### Gruppo 6 — Opportunity e Feed

32. `components/opportunities/OpportunityForm.tsx`
33. `app/api/opportunities/route.ts`
34. `app/api/opportunities/[id]/route.ts`
35. `components/profiles/ProfileMiniCard.tsx` (branch Francia/Feed se diverso)
36. `app/(dashboard)/feed/page.tsx`

### Gruppo 7 — geografia Club, Sponsor e Legal sui branch originali

37. `app/api/profiles/me/residence/route.ts`
38. `app/api/profiles/me/route.ts`
39. `lib/geo/clubGeographyWrite.server.ts`
40. `supabase/migrations/20261221120000_club_geography_reconcile_country_records.sql`
41. `app/sponsor/page.tsx`
42. `components/legal/LocalizedLegalDocument.tsx`
43. `app/legal/layout.tsx`
44. `app/legal/privacy/page.tsx`
45. `app/legal/terms/page.tsx`
46. `app/legal/beta/page.tsx`
47. `app/legal/child-safety/page.tsx`

---

## 23. Definition of Done Mobile

La parity può essere dichiarata completata solo se:

- [ ] tutti e sei i Paesi funzionano realmente;
- [ ] gerarchie geografiche variabili sono supportate;
- [ ] cambio Paese Club usa il backend transazionale;
- [ ] record incompatibili vengono archiviati, non cancellati;
- [ ] cataloghi corrispondono ai conteggi correnti;
- [ ] Francia usa 71 e non 98 combinazioni;
- [ ] Sci, Biathlon e Tennis non sono selezionabili;
- [ ] Calcio 6/7/8 e Futsal restano distinti;
- [ ] Floorball ha ruoli propri;
- [ ] Ente/Categoria sono country-scoped;
- [ ] iscrizioni multiple funzionano;
- [ ] esiste una sola principale attiva;
- [ ] Feed e profilo proiettano la principale;
- [ ] esperienze hanno Paese indipendente;
- [ ] Opportunity validano owner e snapshot;
- [ ] storico Opportunity resta leggibile;
- [ ] Sponsor dà risultati identici al Web;
- [ ] Legal è disponibile IT/EN/FR/ES;
- [ ] navigazione rispetta il ruolo;
- [ ] errori server sono visibili;
- [ ] invalidazioni cache sono testate;
- [ ] test negativi ownership/cross-country passano;
- [ ] Android passa la matrice;
- [ ] iOS passa la matrice;
- [ ] differenze native intenzionali sono documentate;
- [ ] nessun test è sostituito da una verifica solo visiva.

---

## 24. Messaggio pronto da inoltrare a Codex Mobile

Copia integralmente il testo seguente:

> Devi implementare la parity 1:1 Mobile dell'unione funzionale dei branch Web:
>
> 1. `codex/implementa-integrazione-francia-secondo-documentazione`
> 2. `codex/allinea-valori-iscrizioni-e-feed`
> 3. `codex/implementa-cataloghi-paese-dalla-cartella-upload`
>
> Hai accesso in sola lettura alla repository Web `clubandplayer-app`.
>
> Prima di modificare Mobile, apri e leggi integralmente
> `CODEX_MOBILE_FRANCE_AND_FEED_PARITY_AUDIT.md`.
>
> Considera il documento come handoff unificato. La vecchia baseline Francia da 98 categorie è
> superata: il catalogo attivo Francia corrente contiene 71 combinazioni. I cinque nuovi cataloghi
> contengono complessivamente 258 combinazioni: FR 71, ES 60, CH 48, SI 30, PL 49.
>
> Segui nell'ordine la sezione "22. File autorevoli da aprire, in ordine" e tratta la sezione
> "21. Test Web come specifica eseguibile" come acceptance criteria.
>
> Non copiare markup React/Tailwind. Replica contratti API, modelli, UUID canonici, vincoli,
> ordinamenti, fallback, localizzazione, error handling, invalidazioni cache, transizioni di stato,
> ownership e comportamento dipendente dal ruolo.
>
> Requisiti obbligatori:
>
> - supportare IT, FR, ES, CH, SI, PL;
> - supportare gerarchie geografiche variabili;
> - filtrare Ente/Categoria per `countryId` e catena Sport completa;
> - non mostrare Sci, Biathlon o Tennis;
> - mantenere distinti Calcio, Calcio 6/7/8 e Futsal;
> - applicare ruoli dedicati a Calcio 6/7 e Floorball;
> - gestire iscrizioni multiple e una sola principale;
> - proiettare la principale in profilo e Feed;
> - aggiungere Paese alle esperienze passate nel flusso Sport → Paese → Ente → Categoria → Ruolo;
> - validare Opportunity tramite registration attiva e owner;
> - conservare storico e archiviare incompatibilità;
> - implementare cambio Paese Club tramite endpoint/RPC autenticati;
> - invalidare profilo, iscrizioni, palmarès e Feed dopo il cambio;
> - replicare Sponsor con formula Web identica;
> - rendere Privacy, Terms, Beta e Child Safety disponibili IT/EN/FR/ES;
> - mostrare gli errori server reali.
>
> Non usare service-role, non inviare `profileId` alle RPC owner-derived, non scrivere direttamente
> tabelle per simulare cambio Paese e non duplicare nel client la logica server.
>
> Implementa le fasi A–H della sezione 19. Dopo ogni fase aggiungi test unitari, test client API,
> verifica Android/iOS e aggiorna la checklist. Prima di dichiarare completata la parity esegui la
> matrice della sezione 20 e verifica ogni punto della Definition of Done della sezione 23.
>
> Non dichiarare completato il lavoro se una schermata esiste ma non replica vincoli, refresh,
> localizzazione, errori e comportamento Web. La parity è funzionale e contrattuale, non solo visiva.

---

## 25. Limiti di questo audit e verifica finale richiesta

Questo documento è stato costruito sul codice reale del checkout multi-Paese e sul resoconto del
precedente audit Francia/Feed fornito dal product owner. Poiché i commit storici `70f7079` e
`0fee6b8` non sono disponibili nell'object database locale, Codex Mobile deve comunque aprire i due
branch originali e verificare i file marcati "branch Francia/Feed" prima di iniziare la relativa fase.

In caso di divergenza:

1. non scegliere arbitrariamente;
2. confrontare migrazioni applicate e test più recenti;
3. preferire comportamento server più nuovo e non distruttivo;
4. segnalare il conflitto al product owner;
5. aggiungere una differenza intenzionale alla checklist solo dopo approvazione.
