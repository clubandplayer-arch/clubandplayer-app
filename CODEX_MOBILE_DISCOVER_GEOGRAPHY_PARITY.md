# Codex Mobile — Handoff Discover geography parity 1:1

**Data:** 21 settembre 2026  
**Destinatario:** Codex Mobile  
**Repository sorgente autorevole:** `clubandplayer-app` Web, accessibile in sola lettura  
**Baseline Web minima:** commit `6806639` o un suo discendente  
**Obiettivo:** replicare su Mobile il comportamento corrente di **Scopri profili / Chi seguire**, senza reinterpretare residenza, sede, nazionalità o zona di interesse.

---

## 1. Prima regola: Mobile deve consumare l'API Web

Mobile non deve ricostruire queste query direttamente su Supabase e non deve
duplicare nel client la compatibilità canonical/legacy. La fonte di verità è:

```http
GET /api/follows/suggestions
Authorization: Bearer <access-token>
```

Il supporto bearer è già condiviso dal server Web tramite `resolveAuthContext`.
Mobile deve inviare il token della sessione Supabase e gestire `401 AUTH_REQUIRED`
come sessione scaduta/non autenticata.

File Web da leggere per primo:

- `app/api/follows/suggestions/route.ts`
- `lib/validation/follow.ts`
- `lib/api/auth.ts`
- `app/(dashboard)/discover/page.tsx`

---

## 2. Richieste da eseguire

Mobile deve caricare separatamente i quattro tab:

```text
institution
club
player
staff
```

Per ogni tab inviare:

```ts
{
  kind: 'institution' | 'club' | 'player' | 'staff',
  limit: 200,
  geoScope: 'country' | 'region' | 'province' | 'city',
  sportScope: 'mine' | 'all',
  countryId?: string, // UUID canonico; omettere per Tutti i Paesi
  geoAreaId?: string, // UUID canonico; valido soltanto insieme a countryId
}
```

Regole vincolanti:

1. **Non inviare `includeFollowed`**: non appartiene più al contratto.
2. `limit` massimo è `200`; Web richiede `200` per ogni tab.
3. Usare `countryId` e `geoAreaId`, non label localizzate e non ISO2.
4. Al cambio Paese azzerare subito `geoAreaId`.
5. Senza Paese, omettere entrambi gli ID: significa **Tutti i Paesi**.
6. Con `sportScope=all`, non filtrare per lo sport del viewer.
7. Con `sportScope=mine`, lo sport viene applicato dal server usando prima gli
   ID canonici e poi il fallback legacy.
8. Non aggiungere filtri Mobile post-response basati su nazionalità, sede o
   interesse: il server ha già applicato la semantica corretta.

Esempio globale Club:

```http
GET /api/follows/suggestions?kind=club&limit=200&geoScope=province&sportScope=all
```

Esempio Club in Francia:

```http
GET /api/follows/suggestions?kind=club&limit=200&geoScope=province&sportScope=all&countryId=<UUID-FR>
```

---

## 3. Semantica geografica da replicare

### Club ed Enti

Sono indicizzati per **sede**:

- prima `profile_preferences.residence_country_id/residence_geo_area_id`;
- fallback sui campi sede legacy soltanto per organizzazioni non ancora migrate;
- Paesi e aree di interesse non devono mai far apparire un Club/Ente in un altro
  Paese.

Implementazione Web autorevole:

- `loadOrganizationIdsForCanonicalScope` in
  `app/api/follows/suggestions/route.ts`.

### Player e Staff

Sono indicizzati per **zona di interesse**:

- `profile_country_interests`;
- `profile_geo_area_interests`;
- fallback `interest_*` legacy.

La nazionalità è un dato di presentazione usato per la bandiera. Non equivale a
residenza e non deve filtrare Discover. Per Player/Staff non va reintrodotto un
filtro di residenza.

Implementazione Web autorevole:

- `loadPeopleIdsForInterestScope` in
  `app/api/follows/suggestions/route.ts`.

### Tutti i Paesi

Senza `countryId`, la ricerca è globale. Le preferenze del viewer ordinano i
candidati, ma non eliminano quelli esteri. Questo dettaglio evita che un bucket
locale riempia la finestra prima di Club francesi, spagnoli o svizzeri.

---

## 4. Regola “Chi seguire” non negoziabile

I risultati devono contenere **solo utenze non ancora seguite**:

- il server legge `follows.target_profile_id`;
- esclude tutti gli ID già seguiti;
- esclude sempre anche il profilo corrente;
- Mobile non deve reinserire, fondere o mostrare nella lista principale profili
  provenienti dalla cache “Profili che segui”.

Un profilo già seguito può comparire nel widget/lista **Profili che segui**, ma non
nel risultato **Chi seguire**. L'assenza di Leontina FC da Chi seguire, quando è
già seguito, è quindi corretta.

Non aggiungere un toggle `includeFollowed` e non aggirare l'esclusione con una
query Supabase Mobile parallela.

---

## 5. Profili storici e nuovi

Sia i profili storici pubblicati sia quelli nuovi devono poter comparire, purché:

- siano pubblici/attivi secondo i filtri server;
- abbiano un nome pubblico valido;
- corrispondano agli eventuali filtri espliciti;
- non siano già seguiti;
- non siano il profilo corrente.

La compatibilità storica è implementata dal server con
`isProfileEligibleForPublicDiscovery` e fallback geografici legacy. Mobile non
deve richiedere che ogni record abbia già tutti i nuovi campi canonici e non deve
nascondere localmente un risultato perché manca un campo introdotto dopo la sua
pubblicazione.

---

## 6. Contratto di risposta utile alla UI

La risposta di successo contiene:

```ts
{
  ok: true,
  items: Array<{
    id: string,
    kind: 'institution' | 'club' | 'player' | 'staff',
    full_name: string | null,
    display_name: string | null,
    city: string | null,
    country: string | null,
    sport: string | null,
    role: string | null,
    avatar_url: string | null,
    is_verified: boolean | null,
    fan_vote_count: number
  }>,
  nextCursor: null,
  role: 'athlete' | 'club' | 'staff' | 'guest'
}
```

Mobile deve usare `kind` restituito dal server e mantenere il routing:

- `club` → dettaglio Club;
- `institution` → dettaglio Ente;
- `player` e `staff` → dettaglio player-like condiviso.

Il flag certificazione riguarda i Club. `fan_vote_count` viene valorizzato per i
Player.

---

## 7. UX Mobile 1:1

1. Tab: **Ente, Club, Giocatore, Staff**.
2. Paese vuoto: label **Tutti i Paesi**.
3. Area disabilitata/assente finché non è scelto un Paese.
4. Cambio Paese: reset area e nuova richiesta per tutti i tab.
5. Cambio sport: nuova richiesta per tutti i tab.
6. Loading unico o per tab, ma nessuna lista vecchia presentata come risultato del
   nuovo filtro.
7. Empty state soltanto quando `items.length === 0` per il tab.
8. Follow riuscito: rimuovere immediatamente la card da Chi seguire oppure
   invalidare/refetchare la query; il profilo non deve restare suggerito.
9. Unfollow eseguito altrove: invalidare/refetchare Chi seguire, rendendo il profilo
   nuovamente eleggibile se supera gli altri filtri.
10. Deduplicare per `id`, senza fondere la lista con Following.

---

## 8. File Web creati o aggiornati nell'attività

### Runtime/contratti aggiornati

- `app/(dashboard)/discover/page.tsx`
  - quattro richieste per tipo;
  - `limit=200`;
  - UUID geografici stabili in URL;
  - label Tutti i Paesi;
  - nessun `includeFollowed`.
- `app/api/follows/suggestions/route.ts`
  - separazione sede organizzazioni/interessi persone;
  - fallback legacy;
  - catalogo globale senza Paese;
  - filtro sport;
  - esclusione self e already-followed;
  - compatibilità profili storici pubblicati.
- `lib/validation/follow.ts`
  - schema parametri;
  - limite massimo 200;
  - UUID canonici obbligatori quando presenti.

### Audit creati

- `docs/audits/discover-geography-filter-audit-2026-09-21.md`
  - root cause, regole di dominio e correzioni.
- `supabase/runbooks/manual/audit_discover_geography_filter.sql`
  - audit produzione in sola lettura; non è codice da portare nel client Mobile.

### Test aggiornati

- `tests/unit/club-geography-api-contract.test.ts`
- `tests/unit/discover-profile-regressions.test.ts`
- `tests/unit/discover-international-scouting-ui.test.ts`
- `tests/unit/search-discovery-d7-regression.test.ts`
- `tests/unit/phase-5h-suggestion-bearer-auth.test.ts`

Codex Mobile deve leggere questi test come specifica eseguibile, non copiarne le
asserzioni testuali.

---

## 9. Acceptance test Mobile obbligatori

### A. Separazione semantica

- Italia + Club non mostra un Club con sede Spagna soltanto perché interessato
  all'Italia.
- Spagna + Club mostra quel Club se la sede canonica/legacy è in Spagna.
- Italia + Player/Staff usa le zone di interesse, non la nazionalità.

### B. Globale

- Tutti i Paesi + Tutti gli sport include candidati eleggibili italiani, francesi,
  spagnoli e svizzeri entro la finestra server.
- Un profilo storico pubblicato non viene scartato localmente per campi canonici
  mancanti.

### C. Following

- Un profilo già seguito non compare in Chi seguire.
- Dopo Follow, la card scompare e non riappare al refetch.
- Dopo Unfollow, il profilo può ricomparire.
- Il profilo corrente non compare mai.

### D. Contratto/errori

- Bearer mancante/scaduto: stato autenticazione, non empty state falso.
- `countryId` non UUID: errore di validazione mostrato/loggato.
- `geoAreaId` appartenente a un altro Paese: errore di validazione.
- cambio rapido filtri: cancellare/ignorare response obsolete.

---

## 10. Definition of Done parity

La replica Mobile è completa soltanto quando:

- usa lo stesso endpoint autenticato Web;
- implementa tutti e quattro i tab;
- invia gli stessi parametri e gli stessi UUID;
- non reimplementa query geografiche nel client;
- rispetta sede per Club/Enti e interessi per Player/Staff;
- tratta nazionalità Player/Staff come display-only;
- interpreta assenza Paese come Tutti i Paesi;
- mostra profili storici e nuovi eleggibili;
- esclude self e già seguiti;
- invalida correttamente cache dopo Follow/Unfollow;
- supera gli acceptance test della sezione 9.

