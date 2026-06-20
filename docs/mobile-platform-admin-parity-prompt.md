# Prompt operativo per Codex Mobile – Parity 1:1 Platform Admin

Copia e incolla questo file nella conversazione della repo mobile per replicare il comportamento implementato nella repo web.

## Obiettivo
Replicare lato mobile il Platform Admin unico di Club&Player, riservato esclusivamente all'email normalizzata `clubandplayer@gmail.com`, con profilo dedicato e post visibili anche nel feed “following” degli utenti che non seguono l'admin.

## Invarianti obbligatorie
1. L'unico Platform Admin è l'utente autenticato con email normalizzata `clubandplayer@gmail.com`.
2. Nessun'altra email deve ottenere ruolo o privilegi `admin`, anche se DB, metadata o payload client contengono `is_admin = true`, `role = 'Admin'`, `account_type = 'admin'` o `type = 'admin'`.
3. Il profilo admin deve essere trattato come account type dedicato `admin`, non come `club`, non come `player`, non come `staff`.
4. Il profilo admin non deve usare form/validazioni Player: niente obbligo `sport`, niente obbligo `role` sportivo, niente limite anagrafico Player su anno progetto.
5. I post admin devono comparire nella bacheca globale e anche nella bacheca `following` di tutti gli utenti, anche se non seguono il profilo admin.

## Contratto API già disponibile dal web/backend
### `/api/auth/whoami`
Per `clubandplayer@gmail.com` deve essere gestito lato mobile come:
```json
{
  "role": "admin",
  "profile": {
    "account_type": "admin",
    "type": "admin",
    "is_complete": true,
    "completion_path": "/admin/profile"
  },
  "admin": true
}
```

### `/api/profiles/me`
Per il profilo admin, il mobile deve salvare solo campi compatibili con il profilo dedicato:
- `full_name`
- `display_name`
- `avatar_url`
- `club_foundation_year` per “anno nascita progetto” / anno fondazione progetto
- `birth_year` deve restare `null`
- `headline` per “ruolo pubblico” / titolo pubblico admin
- `bio`

Non salvare `sport` e non usare `role` come ruolo pubblico: nel backend `role` resta il marker tecnico `Admin`.

### `/api/feed/posts?scope=following`
Il backend web include già gli autori admin nella lista autori ammessi per lo scope `following`. Se il mobile applica filtri locali aggiuntivi, deve preservare sempre i post con `author_role = 'admin'` o `author_profile.account_type/type = 'admin'`.

## Rotte / schermate mobile da creare o aggiornare
1. Aggiungere un equivalente mobile di `/admin/profile`.
2. La schermata admin profile deve essere raggiungibile solo quando `/api/auth/whoami` restituisce `role = 'admin'`.
3. Se un non-admin prova ad aprire la schermata admin, reindirizzare alla feed/home o mostrare accesso negato.
4. Se un admin prova ad aprire schermate profilo Player/Club/Staff/Fan, reindirizzare alla schermata profilo admin.
5. La voce “Profilo” nel menu/account switcher mobile deve puntare alla schermata admin per `role = 'admin'`.

## UI admin profile richiesta
Campi minimi:
- avatar
- nome profilo admin (`full_name` + `display_name`)
- anno nascita progetto (`club_foundation_year`, esempio `2025`)
- ruolo pubblico (`headline`, esempio `Platform Admin`)
- biografia (`bio`)

Non mostrare:
- sport obbligatorio
- ruolo sportivo obbligatorio
- campi fisici Player
- validazioni anno di nascita Player

## File web di riferimento
- `lib/constants/admin.ts`
- `lib/api/admin.ts`
- `lib/server/profileIntegrity.ts`
- `lib/profiles/completion.ts`
- `app/api/auth/whoami/route.ts`
- `app/api/profiles/me/route.ts`
- `app/api/feed/posts/route.ts`
- `middleware.ts`
- `components/shell/AppShell.tsx`
- `components/auth/RoleGate.tsx`
- `app/admin/profile/page.tsx`
- `app/(dashboard)/player/profile/page.tsx`
- `supabase/migrations/20260620120000_platform_admin_role.sql`
- `docs/platform-admin-mobile-audit-2026-06-20.md`

## Checklist implementativa mobile
- [ ] Estendere enum/tipi account con `admin`.
- [ ] Parser `/api/auth/whoami`: accettare `role = 'admin'` e non degradarlo a `guest`.
- [ ] Gating navigazione: `admin` è ruolo autenticato valido.
- [ ] Profilo admin dedicato: non usare schermata Player.
- [ ] Menu profilo: admin → schermata admin.
- [ ] Salvataggio anno progetto: usare `club_foundation_year`, inviare `birth_year: null`.
- [ ] Salvataggio ruolo pubblico: usare `headline`, non `role`.
- [ ] Feed following: non filtrare via i post admin.
- [ ] Non basare privilegi admin su `is_admin` client-side se l'email/ruolo server non confermano admin.

## Test manuali obbligatori mobile
1. Login Google con `clubandplayer@gmail.com`: deve andare direttamente alla feed/home, non alla scelta ruolo.
2. Aprendo “Profilo” come admin: deve aprire la schermata admin, non Player.
3. Salvare anno progetto `2025`: non deve comparire errore su `profiles_birth_year_check`.
4. Salvare ruolo pubblico “Platform Admin”: deve persistere in `headline`.
5. Login con un'altra email: non deve poter aprire schermata admin né vedere privilegi admin.
6. Utente che non segue l'admin: nel feed following deve vedere i post admin.

## Nota sul DB
Il DB web/backend ha già la migrazione di protezione del ruolo unico in `supabase/migrations/20260620120000_platform_admin_role.sql`. Il mobile non deve duplicare logica di sicurezza client-side: deve rispettare le risposte server e non offrire UI admin a ruoli diversi da `admin`.
