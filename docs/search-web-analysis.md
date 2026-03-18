# Search WEB — Analisi chirurgica e piano correttivo

## 1) Mappa reale della search web

### Entry point UI (web)
- **Search globale**: `app/search/page.tsx` (pagina principale, con tabs `all/opportunities/clubs/players/posts/events`, input testuale e fetch verso `/api/search`).
- **Search nella topbar desktop/mobile**: `components/shell/AppShell.tsx` + `components/search/MobileSearchOverlay.tsx` (submit porta sempre a `/search?q=...&type=all`).
- **Route alias legacy**:
  - `app/search/club/page.tsx` -> redirect a `/search?type=clubs`
  - `app/search/athletes/page.tsx` -> redirect a `/search?type=players`
- **Route /search-map**: `app/(dashboard)/search-map/page.tsx` oggi fa redirect a `/search`.

### API/handler coinvolti
- **Search globale aggregata**: `app/api/search/route.ts`
  - riceve `q/query/keywords`, `type`, `page`, `limit`, opzionale `status`
  - interroga e aggrega: `clubs_view`, `athletes_view`, `opportunities`, `posts`
- **Search mappa** (pipeline separata, oggi non entry principale perché `/search-map` redirige):
  - `app/api/search/map/route.ts`
  - `app/api/search/clubs-in-bounds/route.ts`
  - client service: `lib/services/search.ts`
  - UI mappa residua: `app/(dashboard)/search-map/SearchMapClient.tsx`

## 2) Come funziona oggi davvero

## UI / route
- La pagina `/search` è **query-first**: se `q` è vuoto non ricerca; se `q` < 2 caratteri blocca la ricerca.
- Non espone filtri geografici strutturati (`country/region/province/city`) nella UI della pagina globale.
- Le tabs cambiano solo il tipo entità, non la semantica geografica.

## API `/api/search`
Semantica attuale: **prevalentemente testuale con OR larghi**.

### Parametri realmente usati
- `q` (alias `query`, `keywords`) -> obbligatoria >=2 char
- `type` (`all|opportunities|clubs|players|posts|events` + alias singolari)
- `page`, `limit`
- `status` solo per opportunities (`open|closed|archived|draft`)

### Campi cercati per entità
- **Clubs**: in pratica `clubs_view.display_name ILIKE` (sia risultati sia count). Quindi molto restrittivo sul nome club.
- **Players** (`athletes_view`): OR su `full_name`, `city`, `province`, `region`, `country`, `sport`, `role`.
- **Opportunities**: OR su `title`, `description`, `city`, `province`, `region`, `country`, `sport`, `role`.
- **Posts normali**: `content ILIKE`.
- **Events (post kind=event)**: OR su `content`, `event_payload.title`, `event_payload.description`, `event_payload.location`.

### Ranking/priorità
- Non c'è ranking semantico geografico vs testuale.
- Ordinamenti principali:
  - players/opportunities/posts/events: `created_at desc`.
  - clubs: `display_name asc`.
- In `type=all` viene fatto preview per sezione (max 3), non una classifica cross-entity.

## Geolocalizzazione strutturata
- Nella search globale **non esiste** filtro geografico strutturato restrittivo passato da UI e applicato da API.
- I campi geografici sono trattati come semplici campi testuali in OR con altri campi narrativi.

## 3) Perché oggi sbaglia (casi "Milano" e "Vo")

- Il problema nasce nella combinazione di:
  1. **UI globale solo testuale** (`q`) senza perimetro geografico.
  2. **API aggregata con OR ampio multi-campo/multi-entity**.
  3. **Mix entità eterogenee** (post/event/opportunity/club/player) in uno stesso contenitore UX.

### Caso "Milano"
- Se `q=Milano`, matcha non solo località (`city/province/region`) ma anche:
  - `description` opportunità
  - `content` post
  - `event_payload.location` o descrizione evento
  - eventuali altri campi testuali per player
- Quindi appaiono risultati che contengono la parola "Milano" ma non rappresentano un oggetto geograficamente in Milano.

### Caso "Vo"
- Query breve (>=2) con token ambiguo.
- Con ILIKE `%Vo%` su molti campi testuali, aumenta il rumore (substring match in parole, descrizioni, contenuti post/event).
- Non esiste un vincolo geografico primario che restringa prima il dataset.

## 4) Dati geografici disponibili

## Entità e campi
- **Profile/club/player**: campi `country, region, province, city` + coordinate (`latitude, longitude`, `club_stadium_lat/lng` lato club).
- **Opportunities**: `country, region, province, city`, più `club_id/owner_id/club_name`.
- **Posts/events**: non hanno modello geografico strutturato forte; per eventi c'è `event_payload.location` testuale.

## Note di affidabilità/legacy
- `athletes_view` usa `coalesce(city, interest_city)`: segnala presenza di layer legacy/interesse.
- `clubs_view` è usata ma la definizione SQL non è presente nelle migration tracciate nel repo (possibile oggetto storico non versionato qui).
- Search mappa usa coordinate reali; search globale no.

## 5) Cosa serve per arrivare al target (geo primaria, testo secondario)

## Lato UI (necessario)
- Estendere `/search` con filtro geografico strutturato esplicito:
  - `country` (default IT)
  - `region`
  - `province` (opzionale)
  - `city` (opzionale)
- Separare chiaramente "Perimetro geografico" da "query testuale".
- Passare parametri geografici all'API in querystring.

## Lato API `/api/search` (necessario)
- Accettare e validare parametri geografici strutturati.
- Applicare **prima** filtro geografico restrittivo (AND), **poi** filtro testuale (OR interno ai campi testuali consentiti).
- Ridurre superfici testuali non coerenti quando intent è geografico (specialmente `posts/events`).

## Query server (necessario)
- Per clubs/players/opportunities:
  - costruire query del tipo:
    - `AND country/region/province/city` (con gerarchia coerente)
    - `AND (testo su campi consentiti)` solo se `q` presente.
- Introdurre ranking semplice ma deterministico:
  - exact city/province/region match > prefix > contains.

## Dati/normalizzazione (probabile)
- Consolidare naming e qualità campi geografici (es. coerenza `city` vs `interest_city`).
- Audit qualità dati su opportunities (campi geografici mancanti/incompleti).

## Cosa NON conviene fare
- Non "patchare" solo UI mantenendo API testuale ampia.
- Non affidarsi a post-processing client-side per simulare filtri geografici.
- Non mischiare subito tutte le entità (posts/events) nella stessa semantica di ricerca geografica senza policy dedicata.

## 6) Piano operativo consigliato (basato sui file reali)

### Step A — Semantica API (core)
1. Modificare `app/api/search/route.ts`:
   - aggiunta parsing/validazione parametri geo
   - rifattorizzazione builder query per entità in modalità `geo-first`
2. Aggiungere test route handler (se suite disponibile) per casi:
   - geo-only
   - geo + text
   - text-only fallback

### Step B — Introduzione filtri geografici in UI search web
1. Aggiornare `app/search/page.tsx` con controlli geografici strutturati.
2. Mantenere backward compatibility con query testuale corrente.
3. Aggiornare submit/topbar (`components/shell/AppShell.tsx`) per preservare eventuale stato geo quando si rilancia la query.

### Step C — Definizione policy entity
1. Decidere se `posts/events` restano in `/search` quando sono presenti filtri geo.
2. Se sì, introdurre regole precise (es. solo events con location strutturata futura, non testo libero).

### Step D — Dataset hardening
1. Audit e backfill dei campi geo inconsistenti su `profiles/opportunities`.
2. Allineamento mapping view (athletes/clubs).

### Step E — Parity mobile
- Dopo stabilizzazione web, allineare mobile sui medesimi parametri API e semantica.

## 7) Rischio / impatto

- **Regressioni possibili**:
  - calo improvviso risultati percepiti (ma più pertinenti) su query testuali generiche.
  - differenze tra count storici e nuovi count geo-filtrati.
- **Entità delicate**:
  - opportunities (mix club_id/owner_id, qualità location variabile)
  - posts/events (location testuale non strutturata)
- **Test obbligatori**:
  - query con geo completo e testo ambiguo (`Milano`, `Vo`)
  - geo senza testo
  - testo senza geo (compat)
  - paginazione + counts coerenti per tab
  - coerenza tra tipo `all` e tipo specifico

## 8) Stato modifiche in questa fase

- Ho fatto **solo analisi** e ho aggiunto un documento diagnostico (`docs/search-web-analysis.md`).
- Nessuna modifica a logica runtime/applicativa.
