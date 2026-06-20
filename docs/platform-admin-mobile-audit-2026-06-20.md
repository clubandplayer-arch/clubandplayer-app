# Audit mobile – ruolo Platform Admin e feed globale (2026-06-20)

## Obiettivo
Replicare su mobile il ruolo unico `admin`, riservato esclusivamente all'account `clubandplayer@gmail.com`, e garantire che i post di questo profilo compaiano anche nella bacheca “following” degli utenti che non lo seguono.

## Regole funzionali
1. Solo l'email normalizzata `clubandplayer@gmail.com` può essere considerata Platform Admin.
2. Il profilo associato deve essere migrato da `Club` a:
   - `account_type = 'admin'`
   - `type = 'admin'`
   - `role = 'Admin'`
   - `is_admin = true`
3. Nessun altro utente deve ottenere privilegi admin da `profiles.is_admin`: l'autorizzazione applicativa deriva dall'email allowlistata, non dalla sola colonna DB.
4. Nel feed “all” non serve filtro aggiuntivo: i post admin sono già inclusi nel feed globale.
5. Nel feed “following”, aggiungere sempre gli `author_id` dei profili `account_type = 'admin'` e `is_admin = true` alla lista degli autori consentiti.

## File web modificati da usare come riferimento mobile
- `lib/constants/admin.ts`: costanti e normalizzazione dell'email admin unica.
- `lib/api/admin.ts`: autorizzazione admin vincolata all'email, senza fallback privilegiato su `profiles.is_admin`.
- `lib/server/profileIntegrity.ts`: coercizione del profilo admin solo per l'email riservata.
- `app/api/auth/whoami/route.ts`: risposta `role: 'admin'` e migrazione runtime del profilo `clubandplayer@gmail.com`.
- `app/api/profiles/me/route.ts`: impedisce che update profilo dell'admin lo riportino a `club`.
- `app/api/feed/posts/route.ts`: include gli autori admin nel feed `scope=following`.
- `supabase/migrations/20260620120000_platform_admin_role.sql`: migrazione e trigger DB di protezione.

## Checklist mobile
- Aggiungere il valore `admin` agli enum/tipi account type lato mobile.
- Aggiornare parser di `/api/auth/whoami` per accettare `role = 'admin'`.
- Evitare di trattare `admin` come `club` per schermate riservate ai club (opportunità, roster, verifica club), salvo decisione prodotto diversa.
- Nel rendering card feed/profilo, mostrare label `Admin` o una label neutra di piattaforma.
- Non implementare allowlist configurabili lato client: l'unica fonte è server/API.
- Verificare che il tab “following” mobile usi `/api/feed/posts?scope=following`; se implementa filtri locali, deve preservare i post con `author_role = 'admin'`.

## Test suggeriti mobile
1. Login come `clubandplayer@gmail.com`: `/api/auth/whoami` deve restituire `role: 'admin'`, `profile.account_type: 'admin'`, `admin: true`.
2. Login con qualsiasi altra email: anche se il profilo avesse `is_admin = true`, l'app non deve mostrare privilegi admin.
3. Utente che non segue l'admin: la bacheca following deve includere i post dell'admin.
4. Update profilo admin: dopo il salvataggio il ruolo resta `admin`, non torna `club`.

## Aggiornamento profilo admin web
- Il web usa `/admin/profile` per la modifica dati del Platform Admin; non usare `/player/profile` o form Player/Club per questo ruolo.
- La rotta `/admin/profile` è protetta e va resa accessibile solo quando `/api/auth/whoami` restituisce `role = 'admin'`.
- Campi admin gestiti dal web: `full_name`/`display_name`, `avatar_url`, `birth_year` come anno nascita progetto, `headline` come ruolo pubblico, `bio`.
