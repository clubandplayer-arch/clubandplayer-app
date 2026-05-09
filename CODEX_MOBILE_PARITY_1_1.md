# Codex Mobile — Guida Unificata di Replica Parity 1:1

## Obiettivo
Replicare **semanticamente 1:1** sul progetto mobile tutti i comportamenti introdotti sul web nei branch descritti negli audit/sommari allegati.

> Nota operativa: Codex Mobile ha pieno accesso in sola lettura ai file web, quindi deve verificare i file uno ad uno e copiare la logica (non reinterpretarla).

---

## Principi non negoziabili (fonte di verità)
1. **La fonte di verità è il Web**: i comportamenti implementati nei file web vanno portati su mobile in modo fedele.
2. **Nomenclatura legacy da rispettare**:
   - account utente player = `athlete` (DB/API legacy)
   - nuovo account = `staff`
   - opportunità: `role` resta, aggiunto `role_group`
3. **Compatibilità obbligatoria**:
   - record senza `role_group` vanno trattati come `player`
   - `profiles.type` (legacy) deve rimanere coerente con `profiles.account_type`

---

## Scope completo da replicare

### Blocco A — Auth/Role/Profile (Staff first-class)
- Estendere role/profile types includendo `staff` nei punti di dominio chiave.
- Aggiornare normalizzazione/fallback per evitare degradazione di staff a `guest`.
- Allineare salvataggio profilo: quando cambia `account_type`, allineare anche `type` legacy (idempotente).
- Assicurare `whoami`, gate e middleware consistenti con `staff`.

### Blocco B — Onboarding ruolo (idempotenza)
- In `choose-role` aggiungere card Staff con ordine:
  **Club → Player → Staff → Fan**.
- Selezione staff salva `account_type=staff` (con sync `type=staff` via API profilo).
- Correggere loop onboarding: dopo logout/login, se ruolo valido (incluso staff) non reindirizzare a `choose-role`.

### Blocco C — Database/Migrations retrocompatibili
1. `opportunities.role_group`:
   - aggiunta colonna nullable
   - backfill legacy a `'player'`
   - check constraint `('player','staff')`
2. `profiles` constraints:
   - includere `staff` nei check di `account_type` e `type`
   - **non rinominare** `athlete`

### Blocco D — Opportunities end-to-end con `role_group`
- Tipi/schema: aggiungere `role_group` / `roleGroup`.
- API:
  - GET: esporre `role_group`, normalizzare `null => player`
  - POST: accettare `role_group` opzionale, default server `'player'`
  - PATCH: validare/mutare solo se `role_group` presente in payload
  - List filter: `role_group=player|staff`
- Data layer:
  - includere `role_group` in select/query/normalize/fallback legacy
- Bugfix critico:
  - validazione calcistica legacy (`normalizeToEN`/`required_category`) solo per `role_group=player`
  - bypass per staff (evita 400 su ruoli come “Direttore Sportivo”, “Match Analyst”)

### Blocco E — UI Opportunities
- Create/Edit form: select unica “Ruolo” con due gruppi visuali non selezionabili:
  - PLAYER (ruoli sport-specifici)
  - STAFF (ruoli globali cross-sport)
- Mapping:
  - ruolo player => `role_group=player`
  - ruolo staff => `role_group=staff`
- Cambio sport:
  - se ruolo player non compatibile: reset
  - ruolo staff: mantenere
- List/Detail/Card/Filter:
  - badge Player/Staff
  - filtro UI: Tutte | Player | Staff
  - legacy `null` trattato come Player
  - senza duplicare architettura opportunities

### Blocco F — Applications (staff apply policy)
- Lato server: possono candidarsi `athlete/player/staff`; non `fan/club/guest`.
- UI apply visibile anche per staff.
- Owner non può candidarsi alla propria opportunity.
- Nessuna tabella parallela `staff_applications`.
- Colonna legacy `athlete_id` mantenuta (semantica applicant).

### Blocco G — Public profiles/routing/notifiche/settings
- Profili staff visibili su route player-like: `/players/[id]`.
- Resolver pubblico accetta `athlete + staff` (incluso fallback type legacy).
- Link notifica follow:
  - athlete/player/staff => `/players/[id]`
  - club => `/clubs/[id]`
  - non usare `/profiles/[id]`
- `/settings`: link al profilo pubblico coerente con account type.

### Blocco H — Feed/Nav/Profile staff player-like
- Feed:
  - staff può creare post come player
  - messaggio restrizione mostrato solo ai fan
  - empty state coerente (“Il feed è ancora vuoto” + “Scopri profili”)
  - rimozione box “Profili consigliati” vuoto/skeleton senza dati reali
- Nav/Shell:
  - staff non fan-like
  - avatar/nav e gestione role completi
- Pagina profilo condivisa:
  - titolo “Il mio profilo Staff” per staff
  - ruoli staff dedicati
  - nascondere campi atletici (mano/piede/altezza/peso/...) per staff

### Blocco I — Discover/Following/Signup
- Aggiungere tab **Staff** in `/discover` e `/following` mantenendo style dei tab esistenti.
- `/discover`: separare suggerimenti player in due gruppi (staff vs player) e mostrare lista staff dedicata.
- `/following`: filtro in 3 gruppi (club/player/staff), empty state staff dedicato.
- Card staff con UX player-like (avatar/meta/country), ma toggle rosa solo athlete/player.
- `/signup`: aggiornare copy a:
  “Registrati come CLUB o PLAYER o anche STAFF, pubblica opportunità, costruisci la tua carriera. Iscriviti in pochi secondi”.

### Blocco J — Search/API/UI/Sidebar (super fix finale)
1. `app/api/search/route.ts`
   - supporto `type=staff` ufficiale
   - estendere results/counts con chiave `staff`
   - includere `staff` in normalizeType/supported types
   - query staff dedicata su `profiles` con filtro:
     - `account_type = staff OR type = staff`
     - match testuale su nome/luogo/sport/role
   - count staff coerente con query risultati
   - includere staff in `type=all` e in single-type switch
   - fix TS Vercel: rimuovere confronto impossibile nel ramo players-only
2. `app/search/page.tsx`
   - estendere `SearchType` con staff
   - estendere results/counts UI con `staff`
   - tab Staff tra Player e Post
   - normalizeType frontend con alias staff
   - select ruolo con separatori PLAYER/STAFF come create opportunity
   - reset ruolo se non valido a cambio sport
   - sezione Staff in vista all con CTA “Vedi tutti”
3. `components/search/SearchResultRow.tsx`
   - mappare `staff` in kind label/style
   - badge deve mostrare “Staff” (niente trattino)
4. `components/feed/FollowedClubs.tsx`
   - normalizzare `accountType` includendo staff
   - badge Club/Player/Staff corretto
5. `lib/opps/constants.ts`
   - export condiviso `STAFF_ROLES`

---

## File web di riferimento (checklist parity)

### Batch principale (34 file)
1. `app/(dashboard)/feed/page.tsx`
2. `app/(dashboard)/opportunities/OpportunitiesClient.tsx`
3. `app/(dashboard)/opportunities/[id]/page.tsx`
4. `app/(dashboard)/player/profile/page.tsx`
5. `app/(dashboard)/players/[id]/page.tsx`
6. `app/api/applications/route.ts`
7. `app/api/auth/whoami/route.ts`
8. `app/api/opportunities/[id]/route.ts`
9. `app/api/opportunities/route.ts`
10. `app/api/profiles/me/route.ts`
11. `app/onboarding/choose-role/page.tsx`
12. `app/settings/page.tsx`
13. `components/auth/RoleGate.tsx`
14. `components/feed/FeedComposer.tsx`
15. `components/feed/FeedOpportunities.tsx`
16. `components/layout/LegalNavbar.tsx`
17. `components/notifications/NotificationItem.tsx`
18. `components/opportunities/ApplyCell.tsx`
19. `components/opportunities/OpportunitiesTable.tsx`
20. `components/opportunities/OpportunityCard.tsx`
21. `components/opportunities/OpportunityDetailClient.tsx`
22. `components/opportunities/OpportunityForm.tsx`
23. `components/profiles/ProfileEditForm.tsx`
24. `components/profiles/ProfileHeader.tsx`
25. `components/shell/AppShell.tsx`
26. `lib/api/schemas.ts`
27. `lib/auth/role.ts`
28. `lib/data/opportunities.ts`
29. `lib/server/profileIntegrity.ts`
30. `middleware.ts`
31. `supabase/migrations/20261107110000_add_role_group_to_opportunities.sql`
32. `supabase/migrations/20261107123000_allow_staff_in_profiles_checks.sql`
33. `types/opportunity.ts`
34. `types/profile.ts`

### Batch aggiuntivo (discover/following/signup)
35. `app/(dashboard)/discover/page.tsx`
36. `app/(dashboard)/following/page.tsx`
37. `app/signup/page.tsx`

### Batch aggiuntivo (search/staff fix finale)
38. `app/api/search/route.ts`
39. `app/search/page.tsx`
40. `components/search/SearchResultRow.tsx`
41. `components/feed/FollowedClubs.tsx`
42. `lib/opps/constants.ts`

---

## Piano di replica Codex Mobile (esecuzione consigliata)
1. Leggere i 42 file web in modalità read-only.
2. Riprodurre in mobile nello stesso ordine logico:
   - Auth/Role/Profile
   - Opportunities + `role_group`
   - Applications policy
   - Feed/Nav/Profile
   - Discover/Following/Signup
   - Search end-to-end
3. Non cambiare contratti dati se non dove esplicitamente sopra.
4. Mantenere fallback legacy invariati.
5. Validare parity con test manuali e type-check/build.

---

## Checklist di validazione parity (go-live)
- [ ] Staff selezionabile in onboarding e persistente dopo relogin.
- [ ] Nessun record legacy senza `role_group` rompe UI/API (default player).
- [ ] Opportunities staff create/edit/list/detail/filter funzionanti.
- [ ] Apply consentito a staff e bloccato per owner/fan/club/guest.
- [ ] Staff visibile su route pubbliche player-like e link notifiche corretti.
- [ ] Feed e nav staff coerenti (non fan-like).
- [ ] Discover/Following mostrano tab Staff e badge corretti.
- [ ] Search API trova staff anche con ruoli concreti (es. Presidente).
- [ ] Search UI mostra tab/sezione/count/badge Staff corretti.
- [ ] Build TypeScript pulita (fix Vercel incluso).

