# Club canonical residence hotfix — handoff operativo Web → Mobile 1:1

> **Scopo:** documento vincolante per Codex Mobile. Descrive tutte le modifiche
> introdotte nel branch Web successivo a `b79a1b3`, i contratti da replicare, i
> regressi risolti e la sequenza obbligatoria di micro-PR Mobile.
>
> **Repository Web in sola lettura:** `/workspace/clubandplayer-app`
>
> **Baseline prima del lavoro:** `b79a1b3`
>
> **Ultimo commit funzionale analizzato:** `c3c846e`
>
> Mobile deve replicare il comportamento e i contratti API, non copiare componenti
> React/Next.js né creare migration proprie.

## 1. Risultato funzionale richiesto

La parity è raggiunta soltanto quando Android e iOS implementano e verificano tutti i
seguenti comportamenti:

1. il Club può salvare il profilo con **solo nome Club valido e residenza canonica
   completa** (`countryId + geoAreaId`); iscrizione sportiva, Sport, categoria,
   impianto, indirizzo, biografia e social sono facoltativi;
2. il Club pubblicato non resta bloccato nell'editor e può aprire feed, mappe,
   ricerca, discover e logout;
3. la residenza mostrata sulla mini-card del Club è canonica e non riusa città/Paese
   legacy obsoleti;
4. Sport e Categoria della mini-card derivano dall'iscrizione attiva principale, non
   da `profiles.sport` o `profiles.club_league_category`;
5. creando nuovamente un'iscrizione identica archiviata, il server la riattiva senza
   errore di chiave duplicata;
6. le pagine pubbliche `/clubs/{profileId}` si aprono da mappa, ricerca e discover;
7. Discover Club filtra Paese/Regione tramite residenza canonica, mantenendo il
   fallback per i Club pubblicati non ancora migrati;
8. nel form Opportunity il riepilogo iscrizione localizza lo Sport: `Calcio` (IT),
   `Football` (EN/FR), `Fútbol` (ES).

## 2. Principi architetturali da non violare

- `profiles.id` è il **profile ID** usato da `/clubs/{id}` e dalle relazioni Club.
  Non sostituirlo con `user_id` nei deep link.
- La residenza canonica del Club è in `profile_preferences` ed è esposta dal Web API;
  i campi `profiles.country/region/province/city` sono solo compatibilità legacy.
- `profile_visibility_status = published` insieme a `status = active` è l'autorità
  server per la visibilità pubblica. Il client non deve ricalcolare la completezza di
  un altro Club da una risposta parziale.
- Le iscrizioni canoniche attive sono l'autorità per identità sportiva Club. I vecchi
  `profiles.sport` e `profiles.club_league_category` non devono tornare a prevalere.
- Mobile usa esclusivamente endpoint autenticati/pubblici Web. Vietati accesso diretto
  Supabase, `service_role`, copie della migration o scritture alle tabelle.
- La localizzazione modifica soltanto le label visibili; UUID, code e valori
  persistiti restano invariati.

## 3. Inventario completo del branch Web

### File creati

| File | Funzione |
| --- | --- |
| `supabase/migrations/20261222120000_club_minimum_completion_requirements.sql` | Nuove regole DB di pubblicazione Club, protezione Club storici e refresh su cambio residenza. **Già applicata nell'ambiente indicato dal product owner; Mobile non deve eseguirla.** |
| `tests/unit/club-completion-routing.test.ts` | Regressioni Web per hydration `whoami`, redirect profilo e logout sempre raggiungibile. |
| `tests/unit/club-hotfix-mobile-parity-handoff.test.ts` | Contratto automatico che impedisce di perdere sezioni, file fonte, micro-PR o matrice di questo handoff. |
| `docs/mobile-parity/club-canonical-residence-hotfix-parity-handoff.md` | Questo handoff operativo. |

### File aggiornati

| File | Modifica autorevole | Impatto Mobile |
| --- | --- | --- |
| `lib/profiles/completion.ts` | Club completo con nome valido + `residence_country_id` + `residence_geo_area_id`; rimossi Sport e geo legacy obbligatori. | Allineare validazione editor e guard di navigazione. |
| `components/profiles/ProfileEditForm.tsx` | Rimossa la falsa label `sport: 'registrazioni club'`; save valida la residenza canonica e usa RPC dedicata. | Non richiedere iscrizione/Sport; non inviare placeholder. |
| `app/api/auth/whoami/route.ts` | Carica `profile_preferences.residence_*` prima di calcolare `is_complete`. | Consumare `profile.is_complete`; non ricostruirlo da Profile legacy. |
| `middleware.ts` | `/logout` escluso dal redirect dei profili incompleti. | Logout deve essere sempre raggiungibile. |
| `app/api/clubs/registrations/route.ts` | POST usa upsert sulla chiave completa e riattiva righe archiviate. | Gestire il POST idempotente e rileggere il risultato. |
| `components/profiles/ProfileMiniCard.tsx` | Carica residenza canonica e iscrizione primaria; mostra dati canonical-first. | Replicare nel widget/home card Mobile. |
| `app/(dashboard)/clubs/[id]/page.tsx` | Rimossa seconda validazione client/server incompleta dopo il filtro di pubblicazione. | La schermata pubblica deve fidarsi del 200/404 server e non rivalidare campi legacy. |
| `app/api/follows/suggestions/route.ts` | Discover Club filtra profile ID tramite `profile_preferences`; fallback legacy solo per non migrati; non elimina Club già pubblicati. | Consumare risultati endpoint, senza rifiltrarli localmente. |
| `components/opportunities/OpportunityForm.tsx` | Riepilogo iscrizione localizza Sport via code canonico. | Stessa label IT/EN/FR/ES nel selector Mobile. |
| `tests/unit/club-geography-api-contract.test.ts` | Contratti di regressione residenza, iscrizione, pagina pubblica e Discover. | Fonte dei casi Mobile. |
| `tests/unit/phase-6-club-organization-membership.test.ts` | Iscrizione opzionale e localizzazione riepilogo Opportunity. | Fonte dei casi Mobile. |
| `tests/unit/profile-completion.test.ts` | Requisiti minimi e protezione Club già pubblicati. | Fonte dei casi Mobile. |

## 4. Contratti API e comportamento Mobile

### 4.1 Lettura/salvataggio profilo Club

Endpoint:

```http
GET   /api/profiles/me
GET   /api/profiles/me/residence
PATCH /api/profiles/me
PATCH /api/profiles/me/residence
GET   /api/auth/whoami
```

`GET /api/profiles/me/residence` restituisce almeno:

```json
{
  "enabled": true,
  "writable": true,
  "residence": {
    "source": "canonical",
    "residenceCountryId": "<uuid>",
    "residenceGeoAreaId": "<uuid>"
  }
}
```

Regole Mobile:

1. caricare Profile e Residence come risorse distinte;
2. rendere obbligatori soltanto nome Club valido, `residenceCountryId` e
   `residenceGeoAreaId`;
3. salvare prima i normali dati Profile senza geo legacy, poi la geografia con
   `PATCH /api/profiles/me/residence`;
4. se il PATCH residenza fallisce, mostrare errore e non simulare il successo;
5. dopo il salvataggio rileggere Residence e `whoami`;
6. consentire navigazione quando `whoami.profile.is_complete === true`;
7. non richiedere una registrazione per salvare/pubblicare il Club;
8. non inviare `sport: "registrazioni club"` o altri valori fittizi.

`whoami` è l'autorità per il guard della sessione. Se `is_complete === false`, Mobile
può guidare verso l'editor, ma deve sempre consentire Logout. Errori rete/sessione
scaduta devono mostrare uno stato esplicito, non un loop di redirect.

### 4.2 Geografia canonica e label pubblica

Per ricostruire la label:

```http
GET /api/geo/areas/{residenceGeoAreaId}/ancestors
```

Ordine visivo Web: area selezionata, antenati dal più vicino/radice nel corretto
ordine di presentazione, Paese localizzato. Eliminare duplicati. Esempio FR:
`Ambérieu-en-Bugey, Ain, Auvergne-Rhône-Alpes, Francia`.

Non mostrare `profiles.city/country` quando una residence canonica è disponibile.
Il fallback legacy è ammesso soltanto se la canonical read non produce dati.

### 4.3 Iscrizioni Club

Endpoint owner:

```http
GET  /api/clubs/registrations
POST /api/clubs/registrations
PATCH /api/clubs/registrations/{registrationId}
```

Il GET restituisce le sole righe attive ordinate con la principale per prima, con:

- `id`, `sport_id`, `sport_discipline_id`, `sport_variant_id`;
- `sports_organization_id`, `sports_organization_category_id`;
- `is_primary`, `is_active`;
- `sports.code`, `sports.canonical_name`;
- `organization.code`, `organization.canonical_name`;
- `category.canonical_name`;
- `countryId` al livello risposta.

POST deve essere considerato idempotente dal client: una combinazione identica
archiviata viene riattivata dal server. Dopo POST/PATCH eseguire un nuovo GET. Non
mostrare al pubblico errori SQL raw. La chiave logica completa è:

```text
club_profile_id + sport_id + sport_discipline_id + sport_variant_id +
sports_organization_id + sports_organization_category_id
```

Una sola iscrizione attiva può essere primaria. In UI, quando si sceglie una nuova
principale, richiedere conferma e aggiornare la lista riletta dal server.

### 4.4 Mini-card/Home Club

Caricare in parallelo:

```http
GET /api/profiles/me
GET /api/profiles/me/residence
GET /api/clubs/registrations
```

Precedenze obbligatorie:

```text
Località: residence canonica > legacy Profile
Sport: iscrizione attiva principale > prima attiva > legacy Profile
Categoria: categoria iscrizione principale > nessuna label
```

**Non usare** `profiles.club_league_category` come fallback: potrebbe appartenere a
un'iscrizione storica di un altro Paese. L'iscrizione primaria si trova con
`is_primary === true`, fallback alla prima riga attiva già ordinata.

### 4.5 Profilo pubblico Club e deep link

Rotta Web equivalente:

```text
/clubs/{profileId}
```

Mobile deve usare `profile.id`, non `user_id`, per navigare da:

- Club Map / popup “Visita Club”;
- Search;
- Discover;
- Following;
- card Club collegate a Player/Staff.

Il server ha già applicato `status=active` e `profile_visibility_status=published`.
Se l'endpoint/pagina pubblica restituisce il Club, Mobile non deve rieseguire una
validazione locale basata su Sport o campi geografici legacy. Un vero 404 resta 404.

### 4.6 Discover Club

Endpoint:

```http
GET /api/follows/suggestions?kind=club&countryId=<uuid>&geoAreaId=<uuid-optional>&sportScope=all
```

Regole:

- Paese/Regione sono canonici; il server espande gli area ID discendenti;
- i Club canonical hanno precedenza e non sono inclusi/esclusi tramite vecchi testi;
- i Club pubblicati non ancora migrati conservano fallback legacy;
- il client non deve applicare nuovamente `isProfileComplete` alle righe ricevute;
- stato vuoto solo dopo risposta conclusa; distinguere loading/error/empty;
- cambio filtro cancella la request precedente per evitare risultati fuori ordine.

### 4.7 Search e Map

Search e Map possono restituire Club tramite percorsi differenti, ma ogni card/pin deve
navigare allo stesso `profile.id`. Testare almeno:

- Search per solo Paese → risultati Club → dettaglio apribile;
- Map → nuovo Club → dettaglio apribile;
- Club legacy pubblicato → dettaglio apribile;
- Club canonical in Regione → presente nei risultati coerenti.

### 4.8 Opportunity — iscrizione e localizzazione

Nel selector “Iscrizione del Club”, costruire la label:

```text
localizeSport(registration.sports.code) · organization display name · category.canonical_name
```

Fallback Sport: `sports.canonical_name`, poi `legacy_sport`, poi `—`. Non renderizzare
sempre `sports.canonical_name`, perché è canonico inglese.

Matrice attesa per `sports.code = "football"`:

| Locale | Label |
| --- | --- |
| `it` | `Calcio` |
| `en` | `Football` |
| `fr` | `Football` |
| `es` | `Fútbol` |

La categoria resta la label ufficiale del catalogo salvo diversa regola globale già
presente nel Mobile. Non alterare gli ID inviati con l'Opportunity.

## 5. Database rollout: cosa Mobile deve sapere

La migration Web:

- non cancella Club;
- non aggiorna massivamente `profile_visibility_status`;
- conserva i Club già pubblicati senza canonical residence in una tabella privata di
  grandfathering;
- promuove alle nuove regole un Club quando salva country + area canonici;
- ricalcola la visibilità dopo modifiche a `profile_preferences`.

Mobile **non deve** copiare, applicare o compensare questa logica. Deve usare le API e
lo stato restituito dal server. Se un ambiente Mobile punta a un backend che non ha la
migration/API Web aggiornata, segnare `BLOCKED_BACKEND_VERSION`; non introdurre
fallback divergenti nel client.

## 6. Sequenza obbligatoria di micro-PR Mobile

Procedere una PR alla volta. Dopo ogni PR fermarsi e consegnare il report della sezione
7; attendere autorizzazione esplicita prima della successiva.

### MPR-0 — Audit e matrice endpoint (nessun comportamento nuovo)

- copiare questo file nel repo Mobile come
  `docs/mobile-parity/club-canonical-residence-hotfix-progress.md`;
- mappare screen, navigator, API client, DTO, store/cache, i18n e test Android/iOS;
- registrare base SHA Mobile e Web source SHA;
- verificare l'ambiente backend realmente usato da Debug/Preview/Release.

**Gate:** nessuna modifica funzionale; elenco file/simboli Mobile completo.

### MPR-1 — DTO/API canonical residence e completion

- aggiungere/aggiornare DTO Residence, WhoAmI e Profile;
- implementare GET/PATCH Residence e hydration;
- validazione: solo nome + countryId + geoAreaId;
- rimuovere obbligo iscrizione/Sport e placeholder;
- read-after-write e gestione errori.

**Controllare:** nuovo Club senza iscrizione salva, diventa completo, riapre i dati.

### MPR-2 — Navigation guard e Logout

- usare `whoami.profile.is_complete`;
- impedire loop editor/feed;
- allowlist permanente Logout;
- gestire session expired/offline/error.

**Controllare:** Club completo apre feed; incompleto apre editor; entrambi fanno logout.

### MPR-3 — Iscrizioni Club lifecycle

- lista attive, create, edit, primary, deactivate;
- POST idempotente e read-after-write;
- reset dipendenze Sport → Ente → Categoria;
- nessuna iscrizione obbligatoria per il Profile.

**Controllare:** cambio Paese, iscrizione archiviata, ricreazione senza duplicate key.

### MPR-4 — Mini-card canonical-first

- residence canonical label;
- Sport/Categoria da registration primaria;
- rimozione fallback categoria legacy;
- loading/error senza flash persistente di dati obsoleti.

**Controllare:** cambio Italia → Francia non mostra più città/categoria italiane.

### MPR-5 — Public Club routing da Map/Search

- uniformare deep link su `profile.id`;
- rimuovere rivalidazioni locali obsolete;
- gestire 404 autentico separatamente.

**Controllare:** aprire almeno un Club nuovo e uno legacy da Map e Search.

### MPR-6 — Discover canonical geography

- consumare filtri `countryId/geoAreaId`;
- niente filtro locale di completezza sui Club restituiti;
- loading/error/empty e cancellazione request;
- fallback legacy lasciato al server.

**Controllare:** IT + Lazio, solo IT, FR + Regione, nessun filtro.

### MPR-7 — Opportunity registration localization

- label da `sports.code` tramite vocabolario Mobile;
- fallback canonico/legacy;
- test IT/EN/FR/ES;
- payload Opportunity invariato.

**Controllare:** `Calcio`, `Football`, `Football`, `Fútbol` nei quattro locale.

### MPR-8 — Certificazione finale Android/iOS

- eseguire l'intera matrice della sezione 8 su device/simulator separati;
- allegare request/response redatte e screenshot/video senza dati sensibili;
- verificare nessuna regressione Player/Staff/Ente;
- compilare report finale e lista blocker residui.

## 7. Report obbligatorio dopo ogni micro-PR

Codex Mobile deve rispondere sempre con questo formato:

```markdown
## MPR-X — <titolo>
- Mobile base SHA:
- Mobile commit SHA:
- Web source SHA: c3c846e
- File creati:
- File aggiornati:
- Contratti implementati:
- Comportamento prima/dopo:
- Test automatici (comando + esito):
- Android evidence:
- iOS evidence:
- Network evidence (endpoint/status, nessun token):
- Regressioni controllate:
- Blocker/rischi:
- Stato: READY_FOR_REVIEW | BLOCKED
- Prossimo step proposto: MPR-X+1 (NON iniziare senza autorizzazione)
```

Il product owner deve controllare prima di autorizzare:

1. diff limitato allo scope della MPR;
2. nessun secret/service role/direct Supabase;
3. endpoint e payload identici al Web;
4. test automatici realmente eseguiti;
5. evidenza separata Android/iOS quando richiesta;
6. assenza di fallback hardcoded divergenti;
7. nessuna dichiarazione di parity se un backend è vecchio o un device non è testato.

## 8. Matrice di accettazione parity 1:1

| ID | Scenario | Android | iOS | Evidenza |
| --- | --- | --- | --- | --- |
| CPH-01 | Club salva nome + residence senza iscrizione | NOT STARTED | NOT STARTED | UI + PATCH + reread |
| CPH-02 | Campi opzionali vuoti non bloccano | NOT STARTED | NOT STARTED | UI |
| CPH-03 | Club completo entra nel feed | NOT STARTED | NOT STARTED | navigation |
| CPH-04 | Logout disponibile completo/incompleto | NOT STARTED | NOT STARTED | session cleared |
| CPH-05 | Cambio Paese archivia catalogo incompatibile | NOT STARTED | NOT STARTED | GET before/after |
| CPH-06 | Ricreazione iscrizione identica non duplica | NOT STARTED | NOT STARTED | POST 2xx + GET |
| CPH-07 | Mini-card mostra residence canonica | NOT STARTED | NOT STARTED | screenshot 4 locale |
| CPH-08 | Mini-card usa primary Sport/Category | NOT STARTED | NOT STARTED | response + UI |
| CPH-09 | Club nuovo apribile dalla Map | NOT STARTED | NOT STARTED | profileId + detail |
| CPH-10 | Club legacy apribile dalla Search | NOT STARTED | NOT STARTED | profileId + detail |
| CPH-11 | Discover solo Paese mostra Club | NOT STARTED | NOT STARTED | request + UI |
| CPH-12 | Discover Paese + Regione mostra Club | NOT STARTED | NOT STARTED | request + UI |
| CPH-13 | Discover non rifiltra published Club | NOT STARTED | NOT STARTED | test/store evidence |
| CPH-14 | Opportunity label Sport IT | NOT STARTED | NOT STARTED | `Calcio` |
| CPH-15 | Opportunity label Sport EN | NOT STARTED | NOT STARTED | `Football` |
| CPH-16 | Opportunity label Sport FR | NOT STARTED | NOT STARTED | `Football` |
| CPH-17 | Opportunity label Sport ES | NOT STARTED | NOT STARTED | `Fútbol` |
| CPH-18 | Player/Staff/Ente invariati | NOT STARTED | NOT STARTED | smoke matrix |
| CPH-19 | Offline/retry/session expired | NOT STARTED | NOT STARTED | UI states |
| CPH-20 | Nessun token/PII nei log | NOT STARTED | NOT STARTED | log inspection |

## 9. Anti-pattern da cercare e rimuovere nel Mobile

Cercare esplicitamente:

- obbligo `sport`, registration o category nel validator Club;
- stringhe fittizie equivalenti a `registrazioni club`;
- composizione località sempre da `profile.city/country`;
- categoria sempre da `club_league_category`;
- Sport visualizzato sempre da `canonical_name` inglese;
- deep link Club costruiti con `user_id`;
- `isProfileComplete` locale applicato a profili pubblici parziali;
- guard globale che intercetta Logout;
- Discover che filtra Club su testi `country/region` dopo una risposta canonica;
- chiamate dirette a Supabase o service-role nel bundle;
- cache che conserva residence/registration precedenti dopo il salvataggio.

## 10. Prompt pronto da consegnare a Codex Mobile

```text
Devi implementare la parity Mobile 1:1 del hotfix Club Web. Hai accesso in sola
lettura a /workspace/clubandplayer-app. Leggi integralmente il file
/docs/mobile-parity/club-canonical-residence-hotfix-parity-handoff.md e considera
vincolanti i file Web e i test elencati al suo interno. Copia il documento nel repo
Mobile come docs/mobile-parity/club-canonical-residence-hotfix-progress.md e compila
prima MPR-0 (audit completo).

Procedi esclusivamente con le micro-PR MPR-0…MPR-8 nell'ordine indicato, una alla
volta. Dopo ogni micro-PR fermati, usa esattamente il template di report della sezione
7 e attendi la mia autorizzazione prima di iniziare la successiva. Non modificare il
repo Web, non creare/applicare migration, non usare accesso diretto Supabase o
service_role e non dichiarare parity senza evidenze separate Android/iOS. Gli endpoint
Web sono la fonte di verità. Se il backend usato dal Mobile non contiene questi
contratti, marca BLOCKED_BACKEND_VERSION invece di introdurre fallback divergenti.

Inizia ora soltanto con MPR-0: audit di screen, navigation, API client, DTO, store,
cache, i18n e test, includendo base SHA Mobile e Web source SHA c3c846e. Non fare ancora
modifiche funzionali.
```

## 11. Gate finale prima di dichiarare parity

Parity 1:1 può essere dichiarata soltanto quando:

- MPR-0…MPR-8 sono revisionate e autorizzate;
- CPH-01…CPH-20 sono PASS su Android e iOS oppure hanno blocker esplicito;
- payload catturati dalla UI reale coincidono con i contratti Web;
- Map, Search e Discover aprono lo stesso Club tramite `profile.id`;
- nessun Club storico scompare e nessun dato legacy prevale su canonical;
- i quattro locale sono verificati in UI, non soltanto in unit test;
- non restano migration o modifiche Web da eseguire dal repository Mobile.
