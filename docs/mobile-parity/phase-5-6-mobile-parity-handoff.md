# FASI 5 e 6 — handoff operativo Web → Mobile

> Documento eseguibile da Codex nel repository Club & Player Mobile. Copiare questo
> file nel repository Mobile come `docs/mobile-parity/phase-5-6-progress.md` e
> aggiornare **nello stesso file** il registro di avanzamento dopo ogni mini-PR.

## 0. Stato, baseline e regole di autorità

| Voce | Valore iniziale |
| --- | --- |
| FASE 5 Web certificata | `d69768bb2df05bb8fb7ead409cba83e806b4c76b` |
| FASE 6 Web handoff source | `0718850ac16824afa68a12a0a2b1ed993d64bf70` |
| FASE 6 Player/Staff Experience source | `382398419b81ff8a03d8aab574f6176bb3961e75` + fix `90a14b0a876da26deb141711c679d0f8c113f70b` |
| FASE 6 Production | **NON ASSUMERE APPLICATA/CERTIFICATA** |
| Mobile implementation | **NOT STARTED** |
| Android certification | **NOT STARTED** |
| iOS certification | **NOT STARTED** |

La FASE 5 è la fondazione canonica. La FASE 6 aggiunge per i Club:

- iscrizioni sportive ripetibili e multisport;
- una sola iscrizione attiva principale;
- scelta di un'iscrizione nelle Opportunity con snapshot canonico;
- Palmarès ripetibile con stagione conclusa e piazzamento;
- catalogo italiano Sport → Ente/Federazione → Categoria/Campionato.

La FASE 6 aggiorna inoltre le **Esperienze passate di Player e Staff** con la cascata
Sport → Ente/Federazione → Categoria/Campionato → Ruolo. Questa estensione non rende
però obbligatoria la membership: il catalogo verificato non copre ancora tutti i 14
Sport selezionabili. Il fix Web `90a14b0a876da26deb141711c679d0f8c113f70b` è parte vincolante del contratto Mobile e
prevale sulla prima implementazione `3823984` che richiedeva sempre entrambi gli ID.

La parity richiesta è funzionale, contrattuale, di sicurezza e di localizzazione; non
è una copia pixel-perfect del Web. Non modificare il repository Web. Non creare
migration dal Mobile e non accedere direttamente alle tabelle. Se gli endpoint FASE 6
non sono disponibili nell'ambiente API realmente usato dalla build Mobile, marcare la
riga interessata `BLOCKED` senza simulare un PASS.

### Ordine delle fonti autorevoli

Leggere integralmente prima di modificare il Mobile:

1. `docs/mobile-parity/phase-5-mobile-parity-handoff.md`;
2. `docs/mobile-parity-roadmap.md`;
3. `docs/european-expansion/phase-5j-final-certification.md`;
4. questo documento;
5. route, builder, componenti e test elencati nelle sezioni successive.

In caso di divergenza prevalgono, in ordine: test Web correnti, route/builder Web
correnti, questo handoff, documenti storici. Registrare ogni divergenza nel log.
In particolare, non replicare la validazione Experience antecedente a `90a14b0a876da26deb141711c679d0f8c113f70b`.

## 1. Istruzione pronta da usare in Codex Mobile

```text
Implementa nel repository Mobile la parity funzionale completa delle FASI 5 e 6 Web.
Usa in sola lettura /workspace/clubandplayer-app e leggi integralmente
docs/mobile-parity/phase-5-6-mobile-parity-handoff.md. Copialo nel repository Mobile
come docs/mobile-parity/phase-5-6-progress.md e aggiornane stato, evidenze, SHA, test e
blocker dopo ogni mini-PR. Parti dall'audit, poi procedi autonomamente una mini-PR alla
volta nell'ordine indicato. Non modificare il Web, migration, RLS o Production. Non
usare service_role. Non dichiarare parity in base a soli test unitari o replay API:
M5 e M6 richiedono evidenze separate Android/iOS e payload catturati dalla UI reale.
Fermati solo per un blocker concreto o prima di scritture/teardown remoti non ancora
autorizzati. Per le Esperienze Player/Staff considera obbligatorio anche il contratto
corretto dai commit Web 382398419b81ff8a03d8aab574f6176bb3961e75 e 90a14b0a876da26deb141711c679d0f8c113f70b:
membership assente o completa, mai parziale; non bloccare gli Sport senza catalogo.
```

## 2. Audit Mobile obbligatorio

Prima della prima modifica compilare questa tabella nel file copiato nel Mobile:

| Area | File/simbolo Mobile | Stato attuale | Gap Web | Riutilizzabile | Evidenza |
| --- | --- | --- | --- | --- | --- |
| Framework/architettura | TBD | NOT STARTED | TBD | TBD | TBD |
| Navigazione/deep link | TBD | NOT STARTED | TBD | TBD | TBD |
| HTTP/error mapping | TBD | NOT STARTED | TBD | TBD | TBD |
| Auth/refresh/logout | TBD | NOT STARTED | TBD | TBD | TBD |
| Cache/persistenza | TBD | NOT STARTED | TBD | TBD | TBD |
| Profile | TBD | NOT STARTED | TBD | TBD | TBD |
| Experience | TBD | NOT STARTED | TBD | TBD | TBD |
| Opportunity/Application | TBD | NOT STARTED | TBD | TBD | TBD |
| Search/Discover/Suggestions | TBD | NOT STARTED | TBD | TBD | TBD |
| Club Registrations | TBD | NOT STARTED | FASE 6 | TBD | TBD |
| Club Palmarès | TBD | NOT STARTED | FASE 6 | TBD | TBD |
| i18n IT/EN/FR/ES | TBD | NOT STARTED | TBD | TBD | TBD |
| Test Android/iOS | TBD | NOT STARTED | TBD | TBD | TBD |

L'audit non è una consegna separata: completarlo e procedere subito con la prima
mini-PR non bloccata.

## 3. Fondazione FASE 5 invariata

### Fonti Web

- `lib/taxonomy/canonicalSportFormPayload.ts`
- `lib/taxonomy/canonicalSportSelector.ts`
- `app/api/sports/catalog/route.ts`
- `lib/search/canonicalSportFilters.ts`
- `components/sports/CanonicalSportFilter.tsx`
- `app/api/profiles/me/route.ts`
- `app/api/profiles/me/experiences/route.ts`
- `app/api/opportunities/route.ts`
- `app/api/opportunities/[id]/route.ts`
- `app/api/applications/me/route.ts`
- `app/api/applications/received/route.ts`
- `app/api/search/route.ts`
- `app/api/follows/suggestions/route.ts`
- `app/api/suggestions/who-to-follow/route.ts`
- relativi test in `tests/unit/`

### Catalogo e selezione Sport

Usare esclusivamente `GET /api/sports/catalog`. Validare `sports`, `disciplines`,
`variants`, `legacySports`. Le opzioni visibili derivano da `legacySports`; mostrare un
solo menu e mantenere distinte le 14 label applicative. `disciplineId` e `variantId`
sono interni. Catalogo fallito, incompleto o stale deve produrre errore esplicito,
retry e invalidazione, mai fallback hardcoded.

### Payload sportivo bloccante

Inviare esattamente una alternativa per oggetto:

```json
{"primarySport":{"canonical":{"sportId":"<uuid>","disciplineId":null,"variantId":null}}}
```

oppure:

```json
{"sport":"Calcio"}
```

`sport` e `primarySport` contemporanei sono un blocker. Conservare la label nello
stato UI e rimuoverla soltanto dall'oggetto serializzato canonico. Le righe legacy
restano modificabili senza obbligare UUID non disponibili.

### Matrice account dopo la FASE 6

| Account | Fonte sportiva primaria Mobile |
| --- | --- |
| Player/Athlete | Profile FASE 5, canonical-first con fallback legacy |
| Staff | Profile FASE 5, canonical-first con fallback legacy |
| Club senza iscrizioni canoniche | fallback Profile legacy, sola compatibilità |
| Club con iscrizioni canoniche | iscrizione FASE 6 principale |
| Fan/account non sportivo | nessun campo sportivo implicito |

Questa è una divergenza intenzionale rispetto all'handoff FASE 5 isolato: per il Club
la FASE 6 sostituisce il presupposto di una singola combinazione sul Profile con un
elenco ripetibile. Non reintrodurre sul Mobile un editor singolo concorrente.

## 4. Catalogo FASE 6: Sport → Ente → Categoria

### Endpoint

```http
GET /api/sports/organization-memberships
```

La risposta usa il wrapper standard Web e contiene in `data`:

- `organizations`: `id`, `code`, `canonical_name`, `organization_type`,
  `display_order`, `display_name`;
- `organizationCategories`: `id`, `organization_id`, `sport_id`, `discipline_id`,
  `variant_id`, `code`, `canonical_name`, `display_order`.

### Regole selector

1. mantenere il selector Sport FASE 5 con tutti i 14 valori;
2. mostrare solo enti che possiedono almeno una categoria per l'esatto contesto
   `sportId + disciplineId + variantId`;
3. ordinare enti per `display_order`, mai alfabeticamente;
4. dopo l'Ente mostrare solo categorie dello scope esatto;
5. ordinare categorie per `display_order`, ma mostrare `Giovanili` sempre per ultima;
6. cambiando Sport azzerare Ente e Categoria incompatibili;
7. cambiando Ente azzerare la Categoria incompatibile;
8. non tradurre valori persistiti; tradurre solo label e Sport visualizzato.

Label enti ammesse e ordine globale:

1. LND
2. Lega Calcio a 8
3. E.I.F.A.
4. CSI
5. UISP
6. CSEN
7. AICS
8. OPES
9. ASC
10. ENDAS
11. PGS
12. US ACLI

Fonte UI Web: `components/sports/OrganizationCategoryFields.tsx`. Fonte label:
`lib/sports/organizationDisplay.ts`. Fonte API:
`app/api/sports/organization-memberships/route.ts`. Non copiare il catalogo in una costante Mobile:
leggerlo dall'API e conservarne ordine/relazioni.

### Esperienze passate Player/Staff: contratto corretto

Fonti Web vincolanti:

- `components/profiles/ProfileEditForm.tsx`;
- `lib/profiles/pastExperiences.ts`;
- `app/api/profiles/me/experiences/route.ts`;
- `lib/sports/organizationMembership.server.ts`;
- `tests/unit/past-experience-membership.test.ts`;
- `supabase/migrations/20261217120000_athlete_experience_organization_membership.sql`
  (solo come specifica server; non copiarla né eseguirla dal Mobile).

Il form è disponibile esclusivamente per Player/Athlete e Staff. Ogni riga conserva
`season`, `club`, `sport`, `category`, `organizationId`, `categoryId`, `role` e il
contesto `primarySport`. Il percorso controllato è:

1. Sport canonico tramite il selector condiviso FASE 5;
2. Ente/Federazione filtrato sull'intero scope canonico;
3. Categoria/Campionato filtrata per scope ed ente, con `Giovanili` ultima;
4. Ruolo Player specifico dello Sport oppure ruolo Staff.

Stagione e Club restano campi della riga e sono obbligatori. Una Experience completa
richiede `season + club + sport + role` e ammette **esattamente** due stati membership:

```text
FALLBACK: organizationId="" e categoryId=""
CANONICAL: organizationId=<uuid> e categoryId=<uuid>
INVALID: uno solo dei due ID è valorizzato
```

Il fallback vuoto è intenzionale e deve essere realmente selezionabile/salvabile:
Pallamano, Rugby, Hockey su prato, Hockey su ghiaccio, Baseball, Softball e Lacrosse
possono non avere alcuna categoria nello snapshot catalogo. Il Mobile non deve
disabilitare Salva, inventare enti/categorie, usare costanti locali o impedire il
salvataggio dell'intero Profile in questi casi. Per parity con il Web corrente, la
coppia vuota è accettata anche se lo Sport possiede opzioni; quando entrambi gli ID
sono presenti sarà il server a verificarne attività, relazione e scope esatto.

Cambiando Sport per azione utente azzerare `role`, `organizationId`, `categoryId` e
`category`; cambiando Ente azzerare `categoryId` e `category`. Non alterare questi
valori durante la sola idratazione/rilettura. Le righe legacy già salvate senza UUID
devono restare modificabili e risalvabili senza perdita della categoria testuale.

Usare `GET /api/profiles/me/experiences` per idratare e
`PATCH /api/profiles/me/experiences` con `{ "experiences": [...] }` per sostituire
atomicamente l'elenco owner-scoped (massimo 50 righe). Nel payload canonical inviare
la coppia di UUID; nel fallback omettere gli ID o inviarli vuoti secondo il builder
Mobile, senza produrre una coppia parziale. Dopo il PATCH rileggere la risposta/GET e
verificare che il fallback torni con ID vuoti e che la membership canonical torni
invariata. Non chiamare direttamente RPC o tabelle Supabase.

Test Mobile minimi, separati su Android e iOS:

- create/edit/reread/delete di una Experience Player e una Staff con membership;
- create/edit/reread/delete con uno Sport privo di opzioni e coppia vuota;
- Profile con Experience legacy scoperta dal GET: modifica di un altro campo e save
  senza blocco o perdita dati;
- rifiuto client di ogni coppia parziale e osservazione del rifiuto server per una
  coppia completa ma incompatibile/foreign;
- reset dipendenze al cambio Sport/Ente, ruoli Player/Staff e quattro locale;
- sostituzione atomica: un errore in una riga non deve produrre salvataggi parziali.

## 5. Iscrizioni sportive del Club

### Modello osservabile

Una registrazione restituisce almeno:

```ts
{
  id: string;
  club_profile_id: string;
  sport_id: string;
  sport_discipline_id: string | null;
  sport_variant_id: string | null;
  sports_organization_id: string;
  sports_organization_category_id: string;
  is_primary: boolean;
  is_active: boolean;
  sports?: { code: string; canonical_name: string };
  organization?: { code: string; canonical_name: string };
  category?: { canonical_name: string };
}
```

### Endpoint e payload

| Metodo | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| GET | `/api/clubs/registrations` | Club | proprie iscrizioni attive |
| POST | `/api/clubs/registrations` | Club | crea iscrizione |
| PATCH | `/api/clubs/registrations/{id}` | Club owner | modifica, principale, rimuove |
| GET | `/api/clubs/{clubProfileId}/registrations` | pubblico | sole attive |

POST/PATCH scrivono gli ID canonici, `is_primary` e `is_active`. Una rimozione Mobile
deve inviare `{"is_active":false}`: il pulsante visibile è **Rimuovi**, ma il dato è
soft-deleted. Non inviare DELETE e non nascondere errori server.

### UX e invarianti

- lista ripetibile, aggiunta, modifica e rimozione;
- formato opzione/riga: `Sport · Ente/Federazione · Categoria/Campionato`;
- una sola iscrizione attiva principale;
- spuntando una nuova principale, chiedere conferma e lasciare che la scrittura server
  rimuova atomicamente il flag precedente;
- rimuovendo la principale, chiedere conferma e promuovere esplicitamente un'altra
  iscrizione prima della rimozione; se non esiste, bloccare con messaggio;
- rileggere l'elenco dopo ogni mutazione;
- non cancellare o convertire i campi legacy del Profile;
- cancellare le request al cambio selezione/unmount e impedire doppio submit.

Fonti Web: `components/clubs/ClubRegistrationsSection.tsx`,
`app/api/clubs/registrations/route.ts`, `app/api/clubs/registrations/[id]/route.ts`,
`app/api/clubs/[id]/registrations/route.ts`,
`lib/sports/organizationMembership.server.ts`.

## 6. Palmarès del Club

### Modello osservabile

```ts
{
  id: string;
  season: string;                    // AAAA/AAAA
  placement: 1 | 2 | 3;
  sport_id: string;
  sport_discipline_id: string | null;
  sport_variant_id: string | null;
  sports_organization_id: string;
  sports_organization_category_id: string;
  is_active: boolean;
  sports?: { code: string; canonical_name: string };
  organization?: { code: string; canonical_name: string };
  category?: { canonical_name: string };
}
```

Lo stesso Club può avere, nella stessa stagione, risultati in più sport, enti e
competizioni, compresi più titoli di Campione. È vietato soltanto il duplicato attivo
della stessa combinazione completa Club + stagione + contesto sportivo + ente +
categoria. La rimozione è logica e non cancella la storia fisica.

### Endpoint

| Metodo | Endpoint | Auth | Uso |
| --- | --- | --- | --- |
| GET | `/api/clubs/honors` | Club | proprio Palmarès attivo |
| POST | `/api/clubs/honors` | Club | crea risultato |
| PATCH | `/api/clubs/honors/{id}` | Club owner | modifica o rimuove |
| GET | `/api/clubs/{clubProfileId}/honors` | pubblico | soli risultati attivi |

POST/PATCH usano gli stessi cinque ID canonici dell'iscrizione, più `season`,
`placement`, `is_active`. Validare nel client prima della request e rispettare gli
errori server relativi a ownership, stagione e combinazione incompatibile.

### Stagioni e ordinamento

- campo stagione come menu, non testo libero;
- il 1° luglio si aggiunge la stagione appena conclusa: il 30/06/2026 la più recente è
  `2024/2025`, il 01/07/2026 è `2025/2026`;
- mostrare stagioni concluse dalla più recente alla più vecchia;
- non offrire né accettare stagioni future o anni non consecutivi;
- ordinare i risultati per stagione decrescente, poi placement crescente, data di
  creazione e ID come tie-breaker stabile;
- label placement: `Campione`, `2° posto`, `3° posto` (tradotte per presentazione);
- non mostrare `Campione · 1° posto`.

Fonti Web: `lib/clubs/honorSeasons.ts`, `components/clubs/ClubHonorsSection.tsx`,
`app/api/clubs/honors/route.ts`, `app/api/clubs/honors/[id]/route.ts`,
`app/api/clubs/[id]/honors/route.ts`.

## 7. Profile Club pubblico e privato

### Modifica `/club/profile`

Ordine richiesto:

1. dati ordinari Club;
2. Iscrizioni;
3. Palmarès;
4. Profili social;
5. sezioni successive esistenti.

Iscrizioni e Palmarès salvano indipendentemente dal PATCH generale del Profile. Il
salvataggio Profile non deve tornare a richiedere il vecchio singolo `sport` al Club.
Player e Staff continuano invece a usare il contratto FASE 5.

### Pubblico `/clubs/{id}`

- testata: iscrizione principale in formato `Sport · Ente · Categoria`;
- Dati Club: Sede, Sport, Ente/Federazione, Categoria, Impianto;
- sezione Iscrizioni: sole attive, principale per prima;
- sezione Palmarès: sole voci attive, ordine cronologico server;
- ordine blocchi: Dati Club → Iscrizioni → Palmarès → Biografia;
- senza iscrizioni canoniche, conservare il fallback legacy senza scrivere/backfillare;
- senza Palmarès, non mostrare un box vuoto.

Il Mobile può usare le route pubbliche dedicate o i dati già aggregati dalla propria
API page/view-model, ma non deve eseguire query dirette Supabase né fetch N+1.

## 8. Opportunity e Applications dopo la FASE 6

### Opportunity Club

Oltre al contesto FASE 5, il modello accetta:

```ts
club_sport_registration_id?: string | null;
sports_organization_id?: string | null;
sports_organization_category_id?: string | null;
```

Nel create/edit mostrare **Iscrizione del Club**:

- caricare solo iscrizioni attive del Club autenticato;
- preselezionare la principale;
- consentire una secondaria;
- mostrare `Sport · Ente · Categoria`;
- popolare dalla registrazione selezionata tutti gli ID canonici;
- inviare `club_sport_registration_id` e lo snapshot degli ID sport/ente/categoria;
- non obbligare a ricreare manualmente la cascata;
- mantenere leggibili/modificabili le Opportunity legacy senza registrazione;
- il server deve rifiutare una registrazione appartenente a un altro Club;
- la successiva rimozione della registrazione non deve alterare lo snapshot Opportunity.

Consultare integralmente `components/opportunities/OpportunityForm.tsx`,
`app/api/opportunities/route.ts`, `app/api/opportunities/[id]/route.ts` e
`types/opportunity.ts`. La regola FASE 5 `sport` XOR `primarySport` resta valida nel
payload sportivo; i nuovi ID non autorizzano l'invio simultaneo delle due alternative.

### Applications

Non aggiungere ID di registrazione o Palmarès all'Application. Continuare a proiettare
il contesto dall'Opportunity collegata e verificare separatamente applicant/Club,
duplicati, self-application, ownership e teardown.

## 9. i18n, errori, sicurezza e resilienza

- Lingue obbligatorie: IT, EN, FR, ES.
- Localizzare Sport, label enti, titoli, azioni, conferme, posizioni e stati errore.
- Non tradurre ID o valori canonici persistiti.
- Riutilizzare i nomi controllati restituiti dall'API; `Lega Nazionale Dilettanti` si
  presenta come `LND`.
- Gestire 400/401/403/404/409 e gli errori database senza mostrare un falso successo.
- Refresh token una volta, niente loop 401; logout coerente e cancellazione in-flight.
- Nessuna service-role key, token nei log/screenshot o scrittura diretta catalogo.
- Cache cataloghi con TTL/versione, stale state visibile, retry e invalidazione.
- Una richiesta catalogo per ciclo ragionevole; niente fetch per riga.
- Liste virtualizzate, debounce Search e nessun freeze Android/iOS.

## 10. Piano integrato in mini-PR

| Mini-PR | Contenuto | Gate minimo |
| --- | --- | --- |
| 1 | Audit + F5 catalog models/parser/cache/payload builder | unit parser/XOR/cache |
| 2 | Selector unico + Search + Opportunity filters/deep link | filter-only + reset |
| 3 | Profile Player/Staff/Club fallback + Experience corretta (`90a14b0a876da26deb141711c679d0f8c113f70b`) | membership assente/completa, sport scoperto, legacy, payload UI + reread/atomic replace |
| 4 | Opportunity CRUD + Applications FASE 5 | due account, ownership, teardown |
| 5 | Discover/WhoToFollow + F5 i18n/offline/performance | IT/EN/FR/ES + retry |
| 6 | Catalogo Enti/Categorie + cascata condivisa FASE 6 | ordine/filtro/reset/Giovanili ultima |
| 7 | Iscrizioni Club private/pubbliche + principale | CRUD, ownership, cambio atomico |
| 8 | Opportunity da iscrizione + snapshot | principale/secondaria/legacy/foreign reject |
| 9 | Palmarès privato/pubblico | CRUD, stagione 1 luglio, ordine, duplicati |
| 10 | Certificazione congiunta F5+F6 | matrici Android+iOS e teardown |

Ogni mini-PR deve essere piccola, revisionabile, testata e committata separatamente.
Non schiacciare tutto in un singolo commit anche se il programma è un unico handoff.

## 11. Registro avanzamento da aggiornare nel Mobile

Valori ammessi: `NOT STARTED`, `IN PROGRESS`, `PASS`, `BLOCKED`.

| Mini-PR | Stato | Commit Mobile | Test | Android | iOS | Blocker/prossimo passo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | NOT STARTED | — | — | — | — | Audit + foundation |
| 2 | NOT STARTED | — | — | — | — | — |
| 3 | NOT STARTED | — | — | — | — | — |
| 4 | NOT STARTED | — | — | — | — | — |
| 5 | NOT STARTED | — | — | — | — | — |
| 6 | NOT STARTED | — | — | — | — | — |
| 7 | NOT STARTED | — | — | — | — | — |
| 8 | NOT STARTED | — | — | — | — | — |
| 9 | NOT STARTED | — | — | — | — | — |
| 10 | NOT STARTED | — | — | — | — | — |

### Log divergenze

| Data | Web source | Mobile source | Divergenza | Decisione/equivalenza | Stato |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

### Log evidenze non sensibili

| ID | Platform/build | Scenario | Test/evidenza | Esito | Teardown |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

## 12. Matrice FASE 5

Mantenere M5-01…M5-14 dell'handoff FASE 5 senza riduzioni. Copiare qui stato ed
evidenza reale durante l'esecuzione:

| ID | Scenario | Android | iOS | Evidenza/blocker |
| --- | --- | --- | --- | --- |
| M5-01 | Catalogo e 14 opzioni | NOT STARTED | NOT STARTED | — |
| M5-02 | Selector unico; Calcio/Calcio a 8/Futsal distinti | NOT STARTED | NOT STARTED | — |
| M5-03 | Reset ruolo/categoria | NOT STARTED | NOT STARTED | — |
| M5-04 | Search filter-only canonical + legacy | NOT STARTED | NOT STARTED | — |
| M5-05 | Opportunity filter canonical + legacy | NOT STARTED | NOT STARTED | — |
| M5-06 | Profile canonical save/reread | NOT STARTED | NOT STARTED | — |
| M5-07 | Profile legacy senza perdita | NOT STARTED | NOT STARTED | — |
| M5-08 | Experience Player/Staff: replace atomico, legacy e membership assente/completa | NOT STARTED | NOT STARTED | includere Sport senza categorie |
| M5-09 | Opportunity CRUD | NOT STARTED | NOT STARTED | — |
| M5-10 | Applications/ownership | NOT STARTED | NOT STARTED | — |
| M5-11 | Discover/WhoToFollow | NOT STARTED | NOT STARTED | — |
| M5-12 | IT/EN/FR/ES | NOT STARTED | NOT STARTED | — |
| M5-13 | Offline/retry/session/catalog errors | NOT STARTED | NOT STARTED | — |
| M5-14 | Liste, tastiera, navigation, no freeze | NOT STARTED | NOT STARTED | — |

## 13. Matrice FASE 6

| ID | Scenario | Android | iOS | Evidenza/blocker |
| --- | --- | --- | --- | --- |
| M6-01 | Catalogo enti: 12 label e ordine esatti | NOT STARTED | NOT STARTED | — |
| M6-02 | Cascata Sport → Ente → Categoria e reset, incluse Experience Player/Staff | NOT STARTED | NOT STARTED | — |
| M6-03 | `Giovanili` sempre ultima | NOT STARTED | NOT STARTED | — |
| M6-04 | Iscrizione singola, multisport, più enti | NOT STARTED | NOT STARTED | — |
| M6-05 | Unicità e una sola principale | NOT STARTED | NOT STARTED | — |
| M6-06 | Cambio principale confermato e rimozione | NOT STARTED | NOT STARTED | — |
| M6-07 | Ownership/RLS osservabile e foreign reject | NOT STARTED | NOT STARTED | — |
| M6-08 | Profilo pubblico iscrizioni + fallback legacy | NOT STARTED | NOT STARTED | — |
| M6-09 | Opportunity principale/secondaria + snapshot | NOT STARTED | NOT STARTED | — |
| M6-10 | Palmarès multi-competizione e piazzamenti | NOT STARTED | NOT STARTED | — |
| M6-11 | Stagioni: rollover 1 luglio e ordine cronologico | NOT STARTED | NOT STARTED | — |
| M6-12 | Palmarès pubblico, rimozione e duplicati | NOT STARTED | NOT STARTED | — |
| M6-13 | IT/EN/FR/ES, offline, retry, session expired | NOT STARTED | NOT STARTED | — |
| M6-14 | Android/iOS performance e assenza N+1/freeze | NOT STARTED | NOT STARTED | — |

## 14. Test e certificazione

Per ogni mini-PR eseguire unit test e test integrazione/UI pertinenti. Prima della
chiusura eseguire suite completa, build Android e iOS, test reali nelle quattro lingue,
payload catturati dalla UI, session expired/offline/retry, account disposable separati
e teardown autorizzato.

Non usare lo stesso storage auth per Applicant e Club. Non usare profili reali. Non
considerare test API manuali equivalenti a test UI. Registrare release/build e SHA
Mobile per ogni evidenza.

### Condizione PASS congiunta

Emettere il marker seguente soltanto quando entrambe le matrici sono interamente PASS
su Android e iOS, l'API FASE 6 usata dalla build è realmente disponibile e il teardown
è completo:

```text
MOBILE_PARITY_PHASE_5_6_PASS
phase5_web_release=d69768bb2df05bb8fb7ead409cba83e806b4c76b
phase6_web_release=0718850ac16824afa68a12a0a2b1ed993d64bf70
phase6_player_staff_experience=382398419b81ff8a03d8aab574f6176bb3961e75+90a14b0a876da26deb141711c679d0f8c113f70b
mobile_release=<sha-or-build>
android=pass ios=pass phase5=pass phase6=pass catalog=pass selector=pass
profile=pass experience=pass registrations=pass honors=pass opportunity=pass
applications=pass search=pass suggestions=pass i18n=pass legacy=pass
security=pass performance=pass teardown=pass
```

In qualunque altro caso:

```text
MOBILE_PARITY_PHASE_5_6_STOP
<elenco puntuale di righe M5/M6 non PASS, evidenze mancanti e blocker>
```

## 15. Output obbligatorio di ogni mini-PR Mobile

Restituire sempre:

1. audit/gap affrontato;
2. flusso implementato;
3. file Mobile modificati;
4. contratti Web consultati;
5. differenze deliberate di UX nativa;
6. backward compatibility;
7. test unitari e integrazione/UI;
8. Android e iOS verificati separatamente;
9. blocker;
10. commit;
11. titolo e corpo PR;
12. aggiornamento di questo registro;
13. prossima mini-PR.
