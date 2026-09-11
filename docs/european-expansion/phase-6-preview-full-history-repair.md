# FASE 6 — Repair della history per Preview Supabase

Data: 2026-09-11  
Stato: **REPOSITORY REPAIR COMPLETATO; FULL REPLAY LOCALE PASS; NUOVO BRANCH SUPABASE PENDING**

## Diagnosi

Il `42P01` nasce da `20250221090000_add_club_id_to_opportunities.sql`: è la prima migration precedentemente presente in ordine temporale e apre con `ALTER TABLE public.opportunities`, ma nessun file versionato anteriore creava `public.opportunities`. Anche `profiles`, `clubs`, `saved_views`, `posts`, `notifications`, `follows`, `applications` e la geografia legacy erano prerequisiti non integralmente materializzati dalla history.

La dashboard indica `No repository connected`. Questo significa che il branch `fase-6bis` non sta leggendo questo checkout. Secondo il comportamento documentato di Supabase Dashboard Branching, quando Main ha migration registrate i nuovi branch vengono creati dalle migration esistenti invece che da un full schema dump. Il log osservato è coerente con la history Main già censita nel precedente audit: la prima migration registrata presume una baseline esterna assente nel database vuoto.

Con GitHub Integration il comportamento è differente: lo schema del Preview Branch viene costruito dai file in `supabase/migrations` del branch Git. Per usare la correzione repository è quindi indispensabile collegare il repository con working directory `.` e ricreare/reset del branch dopo che il commit è disponibile. `Deploy to production` deve rimanere disabilitato.

Fonti operative Supabase:

- <https://supabase.com/docs/guides/deployment/branching/dashboard>
- <https://supabase.com/docs/guides/deployment/branching/github-integration>

## Correzione repository

È stata aggiunta `20250220000000_initial_public_schema_baseline.sql`, precedente alla prima ALTER. Crea soltanto lo schema pubblico pre-history necessario: geografia legacy, profili, opportunità, club, viste salvate, post/feed, notifiche, follow e candidature. Non crea oggetti `auth` o `storage`, gestiti dalla piattaforma, e non contiene seed o backfill.

Il replay ha inoltre esposto difetti successivi che il primo `42P01` nascondeva:

1. conflitto storico `post_reactions.kind`/`reaction`: bridge additivo prima della migration storica;
2. `registry_claims` alterata mesi prima della creazione della famiglia registry: foundation con definizioni identiche alla successiva create idempotente;
3. `registry_claim_disputes` alterata senza alcuna create versionata: aggiunta la create completa;
4. due file con la stessa versione `20260720103000`: `normalize_pallavolo_to_volley` è stato rinominato in `20260720102500` per rendere univoca la sequenza;
5. migration puntuali di utenti Production ora accettano il caso coerente `0/0` di un branch vuoto e continuano a fallire sui match parziali;
6. l'import Campania dipendente dalla staging esterna diventa un no-op esplicito quando `it_locations_stage` non esiste; lo schema non dipende da dati operatore non versionati.

Le migration storiche continuano ad applicare la stessa trasformazione quando i record o la staging attesi esistono. Non è stata aggiunta alcuna identità Production fittizia al bootstrap.

## Riproduzione e prova locale

`scripts/test-full-migration-replay.sh` crea un PostgreSQL 16 vuoto, installa esclusivamente un fixture locale degli oggetti Supabase-managed, verifica che ogni versione migration sia unica, applica **tutti** i file SQL in ordine con `ON_ERROR_STOP=1`, verifica le tabelle fondamentali e la variant `seven_a_side`, quindi elimina il database temporaneo.

Risultato: `FULL_MIGRATION_REPLAY_PASS`. Il test iniziale, prima del repair, riproduceva il blocco sulla prima ALTER; le iterazioni successive hanno rilevato e corretto tutti i blocker sopra elencati. Il fixture platform è test-only e dichiara esplicitamente di non essere applicabile a Supabase.

## Confini di sicurezza

- Production non è stata interrogata o modificata.
- Nessun `migration repair`, `db push`, merge Main o deploy Production è stato eseguito.
- La nuova baseline non deve essere applicata retroattivamente a Production.
- La migration Calcio a 7 non è stata applicata: il full replay locale ne prova soltanto la compatibilità nella sequenza.
- Il vecchio branch `fase-6bis` Unhealthy non è evidenza valida dopo il repair e deve essere sostituito/reset soltanto dopo il collegamento Git.

## Unici passaggi manuali indispensabili

1. Pubblicare il branch Git contenente questo repair.
2. In Supabase **Project Settings → Integrations → GitHub**, collegare `clubandplayer-arch/clubandplayer-app`, working directory `.`, mantenendo **Deploy to production disabilitato**.
3. Associare il branch Git di lavoro al Preview Branch oppure eliminare e ricreare `fase-6bis` da quel branch. Non usare `Include data`.
4. Attendere il replay e verificare nei log che inizi da `20250220000000_initial_public_schema_baseline.sql`, termini con `FULL`/deployment healthy e non mostri versioni duplicate.
5. Solo dopo stato Healthy, configurare Vercel Preview con URL e chiavi del nuovo branch e rigenerare il deployment Preview.

Se Supabase continua a iniziare da `20250221090000`, fermarsi: il repository/working directory/branch non è collegato e nessuna migration C7 deve essere applicata manualmente.
