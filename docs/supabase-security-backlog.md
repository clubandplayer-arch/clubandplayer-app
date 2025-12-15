# Supabase security backlog (WARN/INFO)

Questo file traccia i punti del Security Advisor che restano da indirizzare in PR dedicate.

## Funzioni con `search_path` mutabile
- Funzioni coinvolte (dal report): `tg_set_updated_at`, `handle_new_user`, e altre segnalate.
- Azione proposta: per ciascuna funzione eseguire `ALTER FUNCTION ... SET search_path = public, extensions;` (o schema equivalente usato dalle estensioni).
- Verifica: controllare che le funzioni non facciano riferimento a schemi impliciti prima di fissare il `search_path`.

## Estensione `pg_trgm` in `public`
- Spostare l'estensione nello schema `extensions` (o altro schema dedicato) tramite `CREATE EXTENSION ... SCHEMA extensions;` con eventuale `DROP EXTENSION` + ricreazione se necessario.
- Valutare l'impatto su indici/operazioni che referenziano la funzione; adattare eventuali `SET search_path`.

## Protezione password leaked
- Abilitare la protezione da password compromesse tramite dashboard o configurazione di autenticazione.
- In alternativa documentare e applicare una password policy minima lato Auth se la feature non è disponibile nel piano.

## Versione Postgres con patch disponibili
- Pianificare un upgrade gestito via dashboard Supabase alla minor release più recente.
- Definire finestra di manutenzione e validazione post-upgrade.

## `public.it_locations_stage` con RLS attivo ma senza policy
- Decisione: se la tabella è solo staging interna, disabilitare RLS e revocare permessi a ruoli pubblici.
- Se deve restare accessibile al client, aggiungere almeno una policy di SELECT per utenti autenticati o un filtro per proprietario.
