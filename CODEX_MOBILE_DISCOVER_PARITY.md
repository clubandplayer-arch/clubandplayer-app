# Codex Mobile — `/discover` parity guide

This guide explains how the web `/discover` page works so mobile can reproduce the same data contract and behavior 1:1.

## User-facing behavior

`/discover` is a client-side page titled **Scopri profili**. It shows profile suggestions grouped into four tabs:

1. **ENTE** (`institution`)
2. **Club** (`club`) — default active tab
3. **Player** (`player`)
4. **Staff** (`staff`)

The page also exposes two filters:

- **Ambito geografico** (`geoScope`), default `province`:
  - `country` → “Tutta Italia”
  - `region` → “Regione di interesse”
  - `province` → “Provincia di interesse”
  - `city` → “Città di interesse”
- **Sport** (`sportScope`), default `mine`:
  - `mine` → “Solo il mio sport”
  - `all` → “Tutti gli sport”

Whenever either filter changes, the web page refetches all four tabs in parallel and replaces the cached items for every tab.

## API calls mobile must reproduce

For each tab, call:

```http
GET /api/follows/suggestions?kind=<kind>&limit=50&geoScope=<geoScope>&sportScope=<sportScope>
```

Use authenticated cookies/session credentials, equivalent to web `credentials: 'include'`. The web request is explicitly non-cached (`cache: 'no-store'`).

Example default load:

```http
GET /api/follows/suggestions?kind=institution&limit=50&geoScope=province&sportScope=mine
GET /api/follows/suggestions?kind=club&limit=50&geoScope=province&sportScope=mine
GET /api/follows/suggestions?kind=player&limit=50&geoScope=province&sportScope=mine
GET /api/follows/suggestions?kind=staff&limit=50&geoScope=province&sportScope=mine
```

Valid API parameters are:

- `kind`: `institution`, `club`, `player`, `staff`
- `limit`: integer from 1 to 50; web always sends `50`
- `geoScope`: `country`, `region`, `province`, `city`
- `sportScope`: `mine`, `all`

## Response normalization on the client

The endpoint normally returns `items`, but the web client is defensive and accepts `items`, `data`, or `suggestions` as the array source. For each raw item, mobile should normalize fields like web:

```ts
{
  id: item.id,
  display_name: item.display_name ?? item.name ?? null,
  full_name: item.full_name ?? item.name ?? null,
  kind: item.kind ?? (
    item.account_type === 'institution' ? 'institution'
      : item.account_type === 'club' ? 'club'
      : item.account_type ? 'player'
      : null
  ),
  category: item.category ?? null,
  location: item.location ?? null,
  city: item.city ?? null,
  country: item.country ?? null,
  sport: item.sport ?? null,
  role: item.role ?? null,
  avatar_url: item.avatar_url ?? null,
  is_verified: item.is_verified ?? null,
}
```

If the HTTP status is not OK or the JSON contains `ok: false`, show `data.message` when present; otherwise show `Errore nel caricamento dei suggerimenti (<kind>).`.

## Card rendering rules

For each suggestion card:

- The card title uses the same display-name helpers as web:
  - `institution`: club-style display name with fallback `Ente`
  - `club`: club-style display name with fallback `Club`
  - `player` and `staff`: player-style display name with fallback `Profilo`
- The public profile link is:
  - club → `/clubs/{id}`
  - institution → `/institutions/{id}`
  - player/staff → `/players/{id}`
- Avatar image:
  - use `avatar_url` when present
  - otherwise use DiceBear initials URL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
- Tapping the avatar opens a single-image lightbox/preview.
- Show the certified C mark only when `kind === 'club'` and `is_verified` is truthy.
- Show an `ENTE` badge on the institution tab and a `Staff` badge on the staff tab.
- For `player` and `staff`, show a country line when `country` is available. The web extracts an ISO-2 code from the last two letters of the `country` string and shows a flag if that parse succeeds.
- The secondary metadata line is `city · (category || sport) · normalized role`.
  - Hide role labels equal to `athlete`, `player`, or `club`.
  - If there is no metadata, show `—`.
- Every card includes a follow/unfollow button targeting the suggestion profile id.

## Loading, empty, and error states

- During fetch: show “Caricamento suggerimenti…”
- On error: show the error message in an error state.
- When the active tab has no results: show “Nessun suggerimento disponibile.”

## Server-side ranking/filtering summary

The mobile app should not reimplement ranking locally; it should rely on the API. Important server behavior:

1. The endpoint requires an authenticated user. Without auth it returns `AUTH_REQUIRED` and message “Devi accedere per vedere i suggerimenti.”
2. The server loads the viewer profile and returns an empty list if the viewer has no active profile.
3. Geographic filters compare the selected scope against both interest fields and actual profile fields:
   - city: `interest_city` or `city`
   - province: `interest_province` or `province`
   - region: `interest_region` or `region`
   - country: `interest_country` or `country`
4. `sportScope=mine` adds a sport `ilike` filter against the viewer sport.
5. Already-followed profile ids and the viewer’s own profile id are excluded.
6. Public profile visibility filters are applied.
7. Institutions are ordered alphabetically by `full_name`, then `display_name`; other profile types are ordered by latest `updated_at`.
8. Athlete results are enriched from `athletes_view` for `full_name`, `display_name`, and `avatar_url`.
9. Club suggestions are enriched with `is_verified` from approved, paid/waived, non-expired club verification requests.

## Mobile parity checklist

- Default active tab: `club`.
- Default filters: `geoScope=province`, `sportScope=mine`.
- Refetch all four tabs when either filter changes.
- Send `limit=50` for each tab.
- Reuse the same endpoint and render directly from normalized response fields.
- Keep follow button behavior consistent with the shared follow API used elsewhere in the app.
- Keep avatar preview/lightbox behavior for parity with web.
- Preserve web labels and empty/loading/error text exactly if possible.
