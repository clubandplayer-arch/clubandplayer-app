# Account di test: Club e Player

Questi account **solo per QA/demo** permettono di testare feed, search-map e dashboard senza creare nuovi utenti. Le credenziali sono fisse e le email risultano già confermate.

## Credenziali
- **Club**: `club@test.it` / password `club` — account_type `club`, status `active`
- **Player**: `playm@test.it` / password `playm` — account_type `athlete`, status `active`

## Creazione automatica (consigliata)
1. Esporta le variabili (ambiente di sviluppo/staging):
   ```bash
   export SUPABASE_URL="https://<project-ref>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
   ```
2. Esegui lo script:
   ```bash
   node scripts/create-test-users.mjs
   ```
   Lo script crea/aggiorna gli utenti in Supabase Auth (email già confermata) e upserta i profili con campi utili per feed/search-map (display_name, città, sport, ruolo, headline, status=active). Il profilo usa `id` e `user_id` allineati all'UUID dell'utente Auth.

## Creazione manuale
Se preferisci usare la dashboard Supabase:
1. In Auth → Settings, disattiva (temporaneamente) la conferma email oppure conferma manualmente dopo la creazione.
2. Crea gli utenti Auth con le credenziali sopra.
3. Recupera gli UUID degli utenti appena creati (Auth → Users) e sostituiscili in questo snippet SQL, da eseguire in SQL Editor:
   ```sql
   -- profilo club di test
   insert into public.profiles (id, user_id, email, account_type, type, status, display_name, full_name, headline, country, city, sport, role)
   values ('<CLUB_UUID>', '<CLUB_UUID>', 'club@test.it', 'club', 'club', 'active', 'Club Test', 'Club Test', 'Club demo per QA', 'IT', 'Milano', 'Calcio', 'Club')
   on conflict (id) do update set
     account_type = excluded.account_type,
     type = excluded.type,
     status = excluded.status,
     display_name = excluded.display_name,
     full_name = excluded.full_name,
     headline = excluded.headline,
     country = excluded.country,
     city = excluded.city,
     sport = excluded.sport,
     role = excluded.role,
     email = excluded.email;

   -- profilo player di test
   insert into public.profiles (id, user_id, email, account_type, type, status, display_name, full_name, headline, country, city, sport, role)
   values ('<PLAYER_UUID>', '<PLAYER_UUID>', 'playm@test.it', 'athlete', 'athlete', 'active', 'Play M (Test)', 'Play M', 'Atleta demo per QA', 'IT', 'Torino', 'Basket', 'Playmaker')
   on conflict (id) do update set
     account_type = excluded.account_type,
     type = excluded.type,
     status = excluded.status,
     display_name = excluded.display_name,
     full_name = excluded.full_name,
     headline = excluded.headline,
     country = excluded.country,
     city = excluded.city,
     sport = excluded.sport,
     role = excluded.role,
     email = excluded.email;
   ```
4. Verifica login con le credenziali sopra: i profili devono risultare `active` e tipizzati correttamente (`club` / `athlete`).

## Scopo e limitazioni
- Usare esclusivamente in ambienti di sviluppo o staging; non abilitarli in produzione.
- I dati (sport/città/headline) sono generici e servono solo a popolare feed e mappe per le demo.
