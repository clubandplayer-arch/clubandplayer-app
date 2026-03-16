# Audit tecnico completo — Geo Data Flow + Source of Truth Plan

Data audit: 2026-03-16  
Repo: `clubandplayer-app`  
Branch audit: `codex/audit-geo-data-flow-from-main`

## 1) Executive summary

- Il progetto usa **più sorgenti geo concorrenti**:
  1. colonne testuali su `profiles` e `opportunities` (`country/region/province/city`);
  2. tassonomia ID-based `regions/provinces/municipalities` (via `*_id`);
  3. endpoint `/api/italy-locations` che legge dataset separati `it_locations_stage` o `italy_locations_simple`;
  4. fallback statico hardcoded in `lib/opps/geo.ts`.
- I flussi di scrittura principali (profilo e opportunity) sono centralizzati su `/api/profiles/me` e `/api/opportunities*`, ma i reader sono eterogenei e in vari punti fanno fallback da `interest_*` a `city/province/region`.
- Esiste una duplicazione semantica forte tra:
  - `profiles.region/province/city` (residenza/club location)
  - `profiles.interest_region/interest_province/interest_city` (+ relativi ID)
- Le dropdown geografiche non hanno una sola fonte: alcune usano `regions/provinces/municipalities`, altre `/api/italy-locations`, altre fallback statico.
- Root cause: evoluzione incrementale con compatibilità legacy, senza consolidamento unico di dizionario geo e contratto dati unico per tutti i consumer.

---

## 2) Elenco completo tabelle/view/colonne geo (rilevate nel codice)

## 2.1 Tabelle/view geo core

### `public.profiles`
Colonne geo rilevate in uso applicativo:
- `country`, `region`, `province`, `city`
- `interest_country`, `interest_region`, `interest_province`, `interest_city`
- `interest_region_id`, `interest_province_id`, `interest_municipality_id`
- `residence_region_id`, `residence_province_id`, `residence_municipality_id`
- `birth_country`, `birth_region_id`, `birth_province_id`, `birth_municipality_id`

Writer principali:
- `PATCH /api/profiles/me` (normalizza + salva + eventualmente risolve label da ID).
- `POST /api/profiles` (upsert iniziale semplificato).
- `PATCH /api/profiles/[id]` (compat route legacy).

Reader principali:
- `/api/profiles/me`, `/api/profiles/[id]`, `/api/profiles/public` (tramite `getPublicProfilesMap`).
- motori search/suggestions/recommendations (`/api/search`, `/api/search/map`, `/api/follows/suggestions`, `/api/suggestions/who-to-follow`, `lib/opps/recommendations`).

### `public.opportunities`
Colonne geo rilevate in uso applicativo:
- `country`, `region`, `province`, `city`
- metadato correlato: `club_id`, `owner_id`, `created_by`, `club_name`

Writer principali:
- `POST /api/opportunities`
- `PATCH /api/opportunities/[id]`
- form UI `components/opportunities/OpportunityForm.tsx`

Reader principali:
- `GET /api/opportunities`, `GET /api/opportunities/[id]`, `GET /api/opportunities/mine`, `GET /api/opportunities/filter`
- `lib/data/opportunities`, `lib/opps/recommendations`, `/api/notify-opportunity`, `/api/search`.

### `public.regions`, `public.provinces`, `public.municipalities`
Ruolo:
- dizionario geo ID-based per selettori Italia (region/province/comune).

Writer:
- non emersi writer applicativi FE/BE in questo audit (trattate come reference tables).

Reader:
- `lib/geo/location.fetchLocationChildren` (RPC `location_children` con fallback alle tabelle).
- `components/profiles/LocationFields`
- `components/opportunities/OpportunityForm` (client query dirette Supabase).
- `app/api/profiles/me` (risoluzione label da ID per `interest_*`).

### `public.it_locations_stage` / `public.italy_locations_simple`
Ruolo:
- dataset alternativi per endpoint `/api/italy-locations`.

Reader:
- solo `app/api/italy-locations/route.ts` (ordine: prima `it_locations_stage`, fallback `italy_locations_simple`).

### `public.clubs` (tabella distinta)
Colonne geo usate:
- `city`, `province`, `region`, `country`

Reader:
- `/api/clubs` con filtri geo text-based.

Nota: coesiste con `profiles` (club), generando doppia rappresentazione del luogo club.

### `public.clubs_view`, `public.players_view`, `public.athletes_view`
- `players_view`/`athletes_view` espongono city con `coalesce(p.city, p.interest_city)`.
- `clubs_view` è usata in search/opportunities detail per dati club aggregati.

### `public.alerts`
Colonne geo usate:
- `region`, `province`, `city` per match notifiche opportunità.

Reader:
- `/api/notify-opportunity`.

---

## 3) Elenco completo file/route/componenti coinvolti

## 3.1 API route

- `app/api/italy-locations/route.ts`
  - funzione: `GET`, `loadLocations`.
  - legge: `it_locations_stage` / `italy_locations_simple`.
  - output: `regions`, `provincesByRegion`, `citiesByProvince`.

- `app/api/profiles/me/route.ts`
  - funzioni: `GET`, `PATCH`.
  - scrive/legge: `profiles.*` (sia campi standard che `interest_*` + ID).
  - risolve label da tabelle geo (`regions/provinces/municipalities`) quando presenti ID.

- `app/api/profiles/route.ts`
  - funzione: `POST`.
  - upsert profilo con `country/region/province/city`.

- `app/api/profiles/[id]/route.ts`
  - funzioni: `GET`, `PATCH`.
  - route compat con update parziale anche su `interest_*`.

- `app/api/opportunities/route.ts`
  - funzioni: `GET`, `POST`.
  - filtra e scrive `opportunities.country/region/province/city`.

- `app/api/opportunities/[id]/route.ts`
  - funzioni: `GET`, `PATCH`, `DELETE`.
  - update per colonna geo su opportunity.

- `app/api/opportunities/filter/route.ts`
  - funzione: `GET`.
  - costruisce liste filtri uniche da colonne geo di `opportunities`.

- `app/api/opportunities/mine/route.ts`
  - funzione: `GET`.
  - legge campi geo per elenco annunci proprietario.

- `app/api/search/route.ts`
  - funzioni helper: `buildProfileQuery`, `buildOpportunityQuery`.
  - usa `city/province/region/country` in filtri full-text su clubs/players/opportunities.

- `app/api/search/map/route.ts`
  - funzione: `GET`.
  - usa `profiles` con filtri testuali geo + bounds lat/lng.

- `app/api/clubs/route.ts`
  - funzione: `GET`.
  - filtri `city/province/region/country` su tabella `clubs`.

- `app/api/follows/suggestions/route.ts`
  - usa fallback viewer su `interest_*` poi `city/province/region/country`.

- `app/api/suggestions/who-to-follow/route.ts`
  - stessa logica fallback `interest_* || standard`.

- `app/api/notify-opportunity/route.ts`
  - match alerts per `region/province/city` con precedenza city > province > region.

## 3.2 Frontend form/componenti

- `components/profiles/ProfileEditForm.tsx`
  - funzione `loadProfile` e `onSubmit`.
  - legge `/api/profiles/me`; scrive `/api/profiles/me`.
  - salva contemporaneamente campi standard (`region/province/city`) e `interest_*` (+ ID).

- `components/profiles/LocationFields.tsx`
  - componente dropdown IT con ID mapping.
  - fonte dati: `lib/geo/location.fetchLocationChildren` → RPC/tabella geo.

- `components/profiles/InterestAreaForm.tsx`
  - salva zona interesse su `/api/profiles/me` con `interest_*`.

- `components/opportunities/OpportunityForm.tsx`
  - submit POST/PATCH su `/api/opportunities`.
  - source dropdown IT: tabelle `regions/provinces/municipalities` (query dirette client).

- `app/(dashboard)/opportunities/OpportunitiesClient.tsx`
  - filtri geo listaggio opportunità.
  - source dropdown: `useItalyLocations` → `/api/italy-locations` (con fallback statico).

- `hooks/useItalyLocations.ts`
  - fetch + cache + fallback a `FALLBACK_ITALY_LOCATIONS`.

- `lib/opps/geo.ts`
  - dataset statico (`ITALY_REGIONS`, `PROVINCES_BY_REGION`, `CITIES_BY_PROVINCE`).

- `components/forms/LocationPicker.tsx`
  - altro picker geo su `regions/provinces/municipalities`; non risultano import correnti (duplicato/legacy non agganciato).

## 3.3 Data access layer / helper

- `lib/geo/location.ts`
  - helper comune per figli location (rpc `location_children` + fallback tabelle).

- `lib/data/opportunities.ts`
  - repository query con filtri geo su `opportunities`.

- `lib/opps/recommendations.ts`
  - raccomandazioni usando profilo (`interest_province/region/country` fallback) per filtrare opportunities.

- `lib/profiles/publicLookup.ts`
  - espone geo standard (`country/region/province/city`) nei profili pubblici.

## 3.4 SQL/migrations impattanti

- `supabase/migrations/20260717093000_players_view.sql`
  - crea `players_view` e `athletes_view`.
  - `city = coalesce(p.city, p.interest_city)`.

- `supabase/migrations/20260801090000_backfill_interest_labels.sql`
  - backfill label `interest_region/province/city` da ID.

- `supabase/migrations/20260708090500_fix_athletes_view_city.sql` e `20260118120000_fix_athletes_view_display_name.sql`
  - evoluzione `athletes_view`, inclusa logica city da `interest_city`.

---

## 4) Mappa end-to-end dei flow

## 4.1 Modifica profilo Club

1. UI:
   - pagina club profile monta `ProfileEditForm`.
   - componente usa `LocationFields` per selezione geo (IT via ID tables).
2. Read attuale:
   - `loadProfile()` chiama `GET /api/profiles/me`.
   - prende `country/region/province/city` + `interest_*` + ID.
3. Save:
   - `onSubmit()` costruisce `basePayload` con:
     - club `region/province/city` (standard)
     - anche `interest_*` e `interest_*_id` (allineati alla location club quando `isClub`).
   - invia `PATCH /api/profiles/me`.
4. Persistenza:
   - `PATCH /api/profiles/me` salva su `profiles`.
   - se ID presenti e label mancanti, risolve da `regions/provinces/municipalities`.

Tabelle/colonne coinvolte:
- `profiles.country/region/province/city`
- `profiles.interest_country/interest_region/interest_province/interest_city`
- `profiles.interest_region_id/interest_province_id/interest_municipality_id`

Incoerenza chiave:
- per club vengono popolati sia campi “anagrafici location” sia campi “interest_*”, sovrapponendo semantica.

## 4.2 Modifica profilo Player

1. UI:
   - stesso `ProfileEditForm` (branch player) + possibile `InterestAreaForm` in settings.
2. Read:
   - `GET /api/profiles/me`.
3. Save player:
   - `ProfileEditForm` salva:
     - `region/province/city` = residenza (o estero libero)
     - `interest_*` + ID = zona di interesse sportiva
   - `InterestAreaForm` salva solo `interest_*`.
4. Persistenza:
   - `PATCH /api/profiles/me` normalizza/salva.

Tabelle/colonne coinvolte:
- standard `profiles.country/region/province/city`
- interesse `profiles.interest_*` + `interest_*_id`
- residenza ID `residence_*_id`

Incoerenza chiave:
- diversi consumer leggono solo `city/province/region`; altri fanno fallback a `interest_*`.

## 4.3 Creazione Opportunity

1. UI:
   - `OpportunityForm.handleSubmit()`.
   - dropdown IT da `regions/provinces/municipalities` (client-side Supabase).
2. API:
   - `POST /api/opportunities`.
   - normalizza payload e salva `country/region/province/city` in `opportunities`.
3. Persistenza:
   - insert su `opportunities`.

Incoerenza:
- mapping paese non uniforme: il form converte `countryCode` in label (`effectiveCountry()`), mentre altre parti trattano `country` come ISO2.

## 4.4 Modifica Opportunity

1. UI:
   - stesso `OpportunityForm` con `isEdit`.
2. API:
   - `PATCH /api/opportunities/[id]`, update per campo presente (`country/region/province/city`).
3. Persistenza:
   - update su `opportunities`.

## 4.5 Search / filtri listing

### Opportunities listing
- UI filtri in `OpportunitiesClient`.
- dropdown geo da `/api/italy-locations` (hook `useItalyLocations`) + fallback statico.
- query verso `GET /api/opportunities` con `country/region/province/city`.
- filtro effettivo su colonne text `opportunities.*`.

### Global search
- `/api/search` cerca su:
  - `opportunities.city/province/region/country`
  - `athletes_view` e `clubs_view` (queste ultime dipendono da `profiles` e view logic).

### Map search
- `/api/search/map` usa `profiles` + testo su `city/province/region/country` e bound lat/lng.

### Club list endpoint
- `/api/clubs` filtra su tabella `clubs` (non `profiles`) con stesse colonne geo nominali.

Incoerenza trasversale:
- alcuni listing cercano club su `profiles/clubs_view`; altri su `clubs`.

## 4.6 Dropdown geografici (stato attuale)

Esistono **tre pipeline**:

1. Pipeline A (ID-based):
   - `LocationFields` / `OpportunityForm` → `regions/provinces/municipalities` (+ rpc `location_children`).

2. Pipeline B (dataset stage/simple):
   - `useItalyLocations` → `/api/italy-locations` → `it_locations_stage` fallback `italy_locations_simple`.

3. Pipeline C (static fallback):
   - `lib/opps/geo.ts` con array hardcoded region/province/city.

Risultato: dropdown non garantiscono stesso set/normalizzazione ovunque.

---

## 5) Elenco doppioni/incoerenze

1. **Doppio dizionario geo Italia**
   - Dove: `regions/provinces/municipalities` vs `it_locations_stage`/`italy_locations_simple` vs `lib/opps/geo.ts`.
   - Problema: risultati dropdown diversi tra pagine/feature.
   - Criticità: Alta.
   - Azione futura: convergere su una sola fonte primaria + fallback tecnico allineato.

2. **Duplicazione semantica location profilo**
   - Dove: `profiles.region/province/city` e `profiles.interest_region/province/city`.
   - Problema: alcuni consumer usano standard, altri interest, altri fallback misto.
   - Criticità: Alta.
   - Azione futura: definire contratto chiaro per “residenza” vs “zona d’interesse” e applicarlo ovunque.

3. **Campi label + ID duplicati per interesse**
   - Dove: `interest_*_id` + `interest_*`.
   - Problema: rischio disallineamento (serve backfill dedicato già presente in migration).
   - Criticità: Media/Alta.
   - Azione futura: mantenere ID come canonico + label derivata coerente.

4. **Club location su due domini dati**
   - Dove: tabella `clubs` e profilo club in `profiles`/`clubs_view`.
   - Problema: ricerca/filtri club non sempre interrogano stessa base dati.
   - Criticità: Alta.
   - Azione futura: scegliere entità canonica per location club (preferibilmente `profiles` se già centralizzato account).

5. **Country encoding non uniforme**
   - Dove: commenti/tipi suggeriscono ISO2, ma opportunities possono salvare label paese.
   - Problema: filtri eq/ilike meno affidabili, confronti incoerenti.
   - Criticità: Media.
   - Azione futura: standard ISO2 a persistenza, label solo in presentazione.

6. **Componente legacy non usato**
   - Dove: `components/forms/LocationPicker.tsx` non importato.
   - Problema: costo manutenzione + potenziale confusione su quale picker è ufficiale.
   - Criticità: Bassa/Media.
   - Azione futura: deprecare/rimuovere dopo conferma.

7. **Chiave citiesByProvince solo per nome provincia**
   - Dove: `/api/italy-locations` produce mappa città indicizzata da stringa provincia.
   - Problema: collisioni omonimie province (se presenti) e disambiguazione debole.
   - Criticità: Media.
   - Azione futura: chiave composta (`region+province`) o ID canonico.

---

## 6) Root cause principale della confusione attuale

- La confusione nasce da **stratificazione non consolidata**:
  - fase iniziale text-only (`region/province/city`);
  - introduzione successiva modello ID-based (`regions/provinces/municipalities`);
  - introduzione ulteriore di endpoint dataset stage (`/api/italy-locations`) + fallback statico;
  - mantenimento di route compat legacy (`/api/profiles/[id]`, fallback vari nei reader).

In sintesi: più “fonti valide” contemporaneamente senza contratto unico di dominio geo.

---

## 7) Source of truth proposta finale (derivata dall’audit)

## 7.1 Dizionario geografico (dropdown)

Proposta target:
- **Source of truth unica**: `regions/provinces/municipalities` (con ID), via servizio unico (`location_children` + endpoint unico typed).
- `/api/italy-locations` da deprecare o far diventare adapter della stessa base ID-based (non dataset parallelo).
- `lib/opps/geo.ts` da usare solo come fallback tecnico minimale temporaneo (non business source).

Motivazione:
- È già usata dai form critici (`ProfileEditForm` via `LocationFields`, `OpportunityForm`), consente integrità referenziale e risoluzione label consistente.

## 7.2 Profili

- Club:
  - canonical display/filter fields: `profiles.country/region/province/city`.
  - evitare scrittura ridondante in `interest_*` per i club (dopo migrazione).

- Player:
  - mantenere due concetti separati:
    1. residenza anagrafica (`country/region/province/city` + eventuali `residence_*_id`)
    2. area di interesse scouting (`interest_*_id` come canonico; label derivate).
- Reader di raccomandazione/filtri devono dichiarare esplicitamente quale dei due concetti usano.

## 7.3 Opportunities

- canonical: `opportunities.country/region/province/city`.
- country standardizzato ISO2 in storage; label a livello UI.

## 7.4 Club search domain

- scegliere una sola fonte club per geo search/filter (raccomandato: `profiles`/`clubs_view` se è il dominio account centrale).
- `clubs` tabella separata da allineare o deprecare per query pubbliche geo.

---

## 8) Piano operativo in micro-PR (ordine corretto)

## PR-1 (contratto dati + osservabilità, no breaking)
- Definire e documentare contratto geo ufficiale (campi canonici per ciascun dominio).
- Aggiungere test di contratto su serializzazione/normalizzazione country/region/province/city.

## PR-2 (dropdown unificazione)
- Introdurre un unico servizio FE/BE per options geo IT basato su `regions/provinces/municipalities`.
- Agganciare `OpportunitiesClient` e altri consumer che oggi usano `/api/italy-locations`.

## PR-3 (deprecazioni controllate)
- Deprecare fallback statici estesi in `lib/opps/geo.ts` (tenere solo fallback minimo).
- Deprecare `/api/italy-locations` come sorgente indipendente o trasformarlo in adapter della fonte canonica.

## PR-4 (profile semantics cleanup)
- Separare chiaramente nei payload/profile API “residenza” vs “zona interesse”.
- Evitare doppia scrittura club su `interest_*` (introducendo flag compat temporaneo).

## PR-5 (reader normalization)
- Uniformare reader (suggestions/search/recommendations) a una policy esplicita:
  - recommendation giocatore: `interest_*` prioritaria;
  - ricerca anagrafica profili: `city/province/region` standard;
  - fallback legacy ridotti e tracciati.

## PR-6 (clubs domain convergence)
- Consolidare query geo club su fonte unica (`profiles/clubs_view` oppure `clubs`, da scelta architetturale).
- Adeguare `/api/clubs` e consumer per eliminare divergenza.

## PR-7 (migrazioni dati)
- Migrazione allineamento campi ridondanti e normalizzazione country ISO2.
- Backfill + verifiche integrità + cleanup colonne obsolete (solo dopo stabilizzazione reader).

## PR-8 (rimozione codice legacy)
- Rimozione `components/forms/LocationPicker.tsx` se confermato inutilizzato.
- Rimozione fallback e path compat non più necessari.

---

## 9) Dubbi/limiti esplicitamente dichiarati

- In `supabase/migrations` non sono presenti in questo checkout i file originari di creazione tabelle (`profiles`, `opportunities`, `regions/provinces/municipalities`, `it_locations_stage`, `italy_locations_simple`): l’audit schema è quindi basato su uso reale nel codice applicativo e migration incrementali disponibili.
- Non è emersa una definizione SQL diretta di `clubs_view` in questi file, ma il suo uso applicativo è chiaro da query runtime.

