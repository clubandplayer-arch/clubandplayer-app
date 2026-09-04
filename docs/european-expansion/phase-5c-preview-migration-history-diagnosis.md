# FASE 5C — Diagnosi Preview migration history / baseline mancante

Data: 2026-09-04  
Evento: Preview branch `phase-5c-validation`, errore PostgreSQL user-reported `42P01 relation "public.opportunities" does not exist`.  
Stato: **AUDIT COMPLETATO — diagnosi repository-only; nessuna migration remota eseguita; Production non interrogata o modificata**.

## Perimetro

Questo checkpoint analizza l'intera directory versionata `supabase/migrations` per stabilire la causa del fallimento di ricostruzione da zero e separarla dalla sicurezza della migration 5C. Non modifica migration, schema, API o UI e non avvia 5D.

Limiti: il log Preview è fornito dall'utente; nessun accesso a Preview/Production o a `supabase_migrations.schema_migrations` è stato eseguito. L'audit può provare presenza/assenza nel repository, non ricostruire automaticamente lo schema storico creato fuori dalle migration.

## 1. File esatto che fallisce

Il file è:

`supabase/migrations/20250221090000_add_club_id_to_opportunities.sql`

È la prima migration ordinata lessicograficamente/cronologicamente nel repository. La riga 1 contiene esattamente il commento osservato nel log; le righe 2–3 eseguono `ALTER TABLE public.opportunities`. Seguono DML di backfill, FK a `profiles`, indice e trigger, tutti dipendenti dall'esistenza preventiva di `opportunities`; il semplice `IF NOT EXISTS` riguarda la colonna/constraint/index, non rende opzionale la tabella parent.

## 2. Esiste una migration precedente che crea Opportunities?

**No.** La ricerca su tutti i file SQL versionati non trova alcun `CREATE TABLE public.opportunities` o `CREATE TABLE IF NOT EXISTS public.opportunities`. Non esiste quindi una migration precedente — né una successiva — che materializzi la tabella base.

La prima occorrenza è già un `ALTER TABLE` nel file `20250221090000`. Le migration successive aggiungono RLS, policy, indici, category, role group, geografia canonica e nullable city, ma continuano a presupporre la tabella e colonne quali `id`, `owner_id`, `created_by`, `created_at`, `title`, `club_name`, `city`, status e campi sportivi.

Questo gap era già emerso nell'audit Opportunities C1: la migration originaria di creazione non è contenuta nel repository.

## 3. Perché l'ordine Preview fallisce

L'ordinamento Preview non è anomalo: Supabase applica correttamente per timestamp la prima migration disponibile, `20250221090000_add_club_id_to_opportunities.sql`. L'errore è nella **storia incompleta**, non nel sorter.

Production contiene `public.opportunities` perché la tabella è stata verosimilmente creata prima dell'inizio della history versionata, tramite dashboard/SQL manuale, bootstrap non committato, dump iniziale assente o altra history non presente nel checkout. Un database persistente conserva quel prerequisito; un Preview branch vuoto no.

`IF EXISTS` usato in migration successive non risolve il problema:

- `ALTER TABLE IF EXISTS` può saltare un'operazione, ma i successivi `CREATE POLICY ... ON public.opportunities`, indici, trigger, DML o FK falliscono comunque;
- trasformare la prima migration in no-op farebbe proseguire uno schema privo di Opportunities, non uno schema valido;
- modificare retroattivamente una migration già applicata divergerebbe dalla history Production e curerebbe soltanto il primo sintomo.

## 4. Il problema è più ampio di Opportunities

L'inventario completo dei `CREATE TABLE` mostra altre entità fondamentali referenziate prima di una creazione versionata o mai create nella history:

- `profiles`: mai creata, ma richiesta già dalla prima FK e dalla seconda migration messaging;
- `opportunities`: mai creata;
- `clubs` e `saved_views`: mai create, ma le migration RLS 202509 le presuppongono;
- `posts`: mai creata, ma social/feed migration la alterano o la referenziano;
- `regions`, `provinces`, `municipalities`: mai create, ma le migration geografiche italiane le presuppongono;
- `notifications`: viene creata soltanto in `20251002_social_layer.sql`, ma `20250226090000_job5_notifications.sql` la altera mesi prima;
- `follows`: viene creata in `20251002`/ricostruita successivamente, ma `20250226090000` crea già trigger su `public.follows`;
- `applications`: ha una create difensiva soltanto in `20260723090000_applications_mvp.sql`, mentre migration 202509 la alterano, indicizzano e aggiornano prima.

Quindi correggere soltanto `opportunities` produrrebbe una successione di nuovi `42P01`. Il Preview branch ha dimostrato che la repository non è una fonte completa per il bootstrap da database vuoto.

## 5. Correzione strutturale raccomandata

### Decisione

Creare una **baseline pre-history completa e verificata**, con timestamp precedente a `20250221090000`, invece di modificare migration già applicate o aggiungere guardie che nascondono tabelle mancanti.

La baseline deve contenere lo schema minimo realmente esistente immediatamente prima della prima migration: estensioni applicative necessarie, tipi, funzioni prerequisite e tabelle/colonne/constraint base almeno per Profiles, Opportunities, Clubs, Saved Views, Notifications, Follows, Posts, Applications e geografia legacy. `auth` e `storage` restano oggetti platform-managed Supabase, referenziati ma non duplicati impropriamente.

### Come costruirla in sicurezza

1. **Raccogliere evidenza read-only** dallo schema Production e dalla migration history remota: DDL, colonne, tipi, default, nullability, PK/FK/check/index, RLS, policy, grant, owner, trigger e funzioni.
2. Confrontare lo snapshot corrente con ogni migration repository per sottrarre le modifiche successive e ricostruire il contratto pre-`20250221090000`; non copiare semplicemente lo schema corrente come baseline e poi riprodurre tutte le migration.
3. Cercare eventuali dump/bootstrap storici o commit precedenti che costituiscano una fonte più affidabile del reverse engineering.
4. Generare una migration baseline idempotente e **no-op sugli oggetti già esistenti in Production**, senza DML/backfill utente e senza ridefinire oggetti Supabase-managed.
5. Aggiungere un test di full replay su PostgreSQL/Supabase locale da database vuoto, applicando l'intera directory in ordine, non soltanto 5C.
6. Verificare schema diff finale contro un dump read-only atteso: tabelle, colonne, constraint, indici, policy, grant, funzioni, trigger e view.
7. Creare un Preview branch nuovo e certificare replay completo prima di considerare risolto il blocker.
8. Soltanto dopo, pianificare l'inserimento della baseline nella history Production. Essendo una migration retrodatata, il normale push può richiedere `--include-all`/history reconciliation: comando e target vanno approvati esplicitamente e prima provati su ambiente isolato.

### Alternative non raccomandate

- **Non** cambiare `ALTER TABLE public.opportunities` in `ALTER TABLE IF EXISTS`: nasconde il prerequisito e lascia lo schema incompleto.
- **Non** aggiungere `CREATE TABLE opportunities` dentro `add_club_id...`: mescola baseline e feature, non risolve gli altri prerequisiti e rischia una definizione parziale.
- **Non** riscrivere/rinominare tutte le vecchie migration applicate: aumenta il drift con Production.
- **Non** usare un dump dello schema corrente come baseline davanti alla history senza neutralizzare in modo verificato le duplicazioni e i DML storici.
- **Non** marcare manualmente tutte le migration come applicate sul Preview: produrrebbe metadata senza schema.

### Possibile strategia di transizione

La soluzione più prudente è un checkpoint separato **migration-history baseline repair**, fuori da 5D:

- A: audit Production read-only autorizzato;
- B: baseline draft repository-only;
- C: full replay locale con Supabase services;
- D: schema diff e security audit;
- E: Preview branch nuovo;
- F: piano Production history reconciliation, separato dall'applicazione della migration 5C.

Non viene creata tale baseline in questo checkpoint perché mancano lo snapshot remoto autorizzato e la prova dello schema pre-history; inventare colonne/constraint sarebbe più rischioso del blocker attuale.

## 6. Impatto su Production

Il fallimento Preview non dimostra una regressione Production: Production possiede già `public.opportunities` e ha assorbito la history in un contesto con una baseline preesistente. Non bisogna rieseguire o modificare `20250221090000_add_club_id_to_opportunities.sql` su Production per risolvere Preview.

Una futura baseline retrodatata deve essere progettata per non alterare Production e deve essere riconciliata con la tabella di migration history. Tuttavia `CREATE TABLE IF NOT EXISTS` da solo non basta a certificare no-op: policy, constraint, trigger, owner e grant richiedono confronto esplicito. Nessun history repair remoto è autorizzato da questa diagnosi.

## 7. La migration 5C può essere applicata a Production?

**Sì, condizionatamente a un preflight Production read-only PASS e con autorizzazione esplicita all'apply.** Il blocker Preview avviene nel 20250221, molto prima che il replay raggiunga 5C; non è un errore SQL osservato nella migration 5C. La 5C è stata applicata due volte con successo su PostgreSQL 16.15 locale contro fixture delle sue dipendenze.

L'apply Production può procedere indipendentemente dal baseline repair soltanto se il preflight conferma:

1. migration 5C non già registrata/applicata;
2. esistenza di `profiles`, `countries`, `geo_areas`, `sports`, `sport_disciplines`, `sport_variants`;
3. PK/UNIQUE e tipi compatibili delle colonne referenziate (`id`, `sport_id`, `discipline_id`);
4. ruoli `anon`, `authenticated`, `service_role` disponibili;
5. nessuno dei 19 nuovi nomi tabella, tre nomi funzione/trigger e indici/constraint 5C già presente in forma incompatibile;
6. `profiles.user_id` e `profiles.is_admin` disponibili per le policy;
7. backup/recovery point e finestra di rollout approvati;
8. esecuzione del file integro in transazione e post-apply read-only su 19 tabelle, RLS, 76 policy, tre trigger, grant e conteggi zero.

Il vantaggio è che 5C non legge o scrive `opportunities` e non dipende dalla ricostruibilità dell'intera history: dipende soltanto dalle foundation sopra elencate. Il rischio residuo è operativo/history drift, non un conflitto noto con Opportunities.

**Distinzione obbligatoria:** “5C applicabile condizionatamente a Production” non significa “5C applicata”, “Preview risolto” o “5D autorizzata”.

## 8. Piano operativo immediato

| Ordine | Attività | Stato/autorizzazione |
| --- | --- | --- |
| 1 | Conservare log e branch Preview fallito | manuale, nessun write DB |
| 2 | Non modificare vecchie migration | decisione immediata |
| 3 | Eseguire preflight Production 5C read-only | richiede autorizzazione a interrogare Production |
| 4 | Applicare 5C a Production | separata autorizzazione mutativa dopo PASS |
| 5 | Post-apply 5C read-only + smoke Web minimo | obbligatorio se applicata |
| 6 | Audit baseline Production/history read-only | autorizzazione separata; può condividere la finestra read-only del punto 3 |
| 7 | Implementare baseline repair e full-replay test | task repository separato |
| 8 | Ricreare Preview e certificare full replay | dopo baseline repair |
| 9 | FASE 5D | **NON AUTORIZZATA / NON AVVIATA** |

## 9. Verifiche umane richieste

In questo checkpoint diagnostico: nessuna verifica UI/visiva. È richiesta soltanto la conferma decisionale su quale percorso autorizzare:

- **Percorso P:** preflight read-only e successivo apply controllato 5C su Production;
- **Percorso B:** audit read-only necessario a costruire la baseline;
- preferibilmente P+B nello stesso audit read-only, mantenendo l'apply mutativo come gate separato.

Se 5C verrà applicata, sono obbligatori i controlli umani già documentati: esito runner, 19 tabelle, conteggi zero, RLS 19/19, policy 76, trigger 3 e smoke Web/API senza HTTP 500.

## 10. Checkpoint

| Voce | Stato |
| --- | --- |
| Fase | FASE 5C — follow-up migration history |
| Stato | **AUDIT COMPLETATO / PREVIEW BLOCCATA DA BASELINE MANCANTE** |
| Codice/schema runtime modificato | no |
| Documento modificato | sì, diagnosi + roadmap |
| Migration creata/testata/applicata in questo checkpoint | no / non applicabile / no |
| Production interrogata/modificata | no / no |
| RLS/grant/ownership modificati | no |
| Applications modificata | no |
| Impatto Web/API | nessuno |
| Test automatici | `git diff --check`, 296 unit test, lint, typecheck PASS; build bloccata dal fetch Google Fonts |
| Mobile | NOT STARTED / NON MODIFICATO per FASE 5 |
| Blocker | full migration history non ricostruibile da zero |
| 5C Production | applicabile solo dopo preflight read-only PASS e autorizzazione mutativa |
| Prossimo passaggio autorizzabile | preflight P+B oppure baseline repair repository-only dopo evidenza |

## 11. Percorso P+B autorizzato — stato esecuzione

L'utente ha autorizzato P+B esclusivamente read-only. Nell'ambiente agente sono stati verificati il collegamento locale metadata Supabase e la disponibilità dei client senza esporre valori sensibili. Il repository contiene `supabase/.temp/linked-project.json` e un pooler URL template, ma:

- non è installata/disponibile la Supabase CLI;
- non è disponibile `psql`;
- non sono presenti variabili ambiente Supabase/Postgres o una password database;
- il pooler URL locale non costituisce una credenziale utilizzabile.

Di conseguenza **Production non è stata interrogata** e non è possibile dichiarare PASS o FAIL del preflight. Lo stato corretto è **BLOCCATA — NOT EXECUTED per assenza di client/credenziali**, non un fallimento della migration.

È stato aggiunto il report SQL read-only:

`scripts/sports/reports/phase-5c-production-preflight-and-baseline-audit-read-only.sql`

Il report apre `BEGIN TRANSACTION READ ONLY`, esegue esclusivamente query catalogo e termina con `ROLLBACK`. Copre:

- identità target e stato/versioni `supabase_migrations.schema_migrations`;
- prerequisiti, colonne, tipi, PK/UNIQUE e ruoli richiesti da 5C;
- collisioni sui 19 oggetti, funzioni, trigger e indici 5C;
- esistenza, RLS e owner delle entità baseline;
- colonne/default/nullability, constraint/FK, indici, policy, grant, trigger, firme/config delle trigger function e view dipendenti;
- nessun body funzione, dato utente o write.

Un test unitario fail-closed verifica che il report resti transazionalmente read-only e contenga la matrice P+B richiesta. Suite: **299/299 PASS**.

### Esito richiesto, separato

| Output richiesto | Stato attuale |
| --- | --- |
| Preflight 5C Production | **BLOCCATO / NOT EXECUTED — nessuna connessione autenticata** |
| Collisioni Production | **NON VERIFICATE** |
| Dipendenze Production | **NON VERIFICATE** |
| Migration history Production | **NON INTERROGATA** |
| Evidenza futura baseline | inventario repository completato; report remoto pronto, output mancante |
| Apply 5C | **NON ESEGUITO / NON AUTORIZZATO** |
| Baseline migration | **NON CREATA, come richiesto** |
| FASE 5D | **NOT STARTED** |

### Workflow umano necessario per sbloccare

Eseguire il file completo nel Supabase SQL Editor Production autenticato come amministratore database, senza modificarlo, quindi esportare tutti i result set evitando credenziali/segreti. Il comando alternativo, se viene fornita fuori banda una connection string database autenticata, è:

```bash
psql "$PRODUCTION_DATABASE_URL" \
  -X -v ON_ERROR_STOP=1 \
  -f scripts/sports/reports/phase-5c-production-preflight-and-baseline-audit-read-only.sql \
  > phase-5c-production-read-only-audit.txt
```

Il file di output può contenere metadata di schema e non deve essere committato automaticamente. Dopo aver ricevuto gli output, classificare preflight PASS/FAIL e collisioni; l'eventuale apply resta un'autorizzazione separata.

## 12. Primo run Production e report consolidato v2

L'utente ha eseguito integralmente il report P+B v1 nel SQL Editor Production: **USER-REPORTED SUCCESS, nessun errore e nessuna write**. Il client ha però consentito di copiare soltanto l'ultimo result set, quindi l'unica evidenza restituita riguarda cinque view dipendenti (`athletes_view`, `cities`, `clubs_view`, `players_view`, `public_institutional_entities`). Questa evidenza conferma dipendenze reali da `profiles`, `players_view`, `regions`, `provinces`, `municipalities` e institutional verification, ma non contiene history, prerequisite, tipi o collisioni necessari a classificare 5C.

Il report è stato quindi sostituito dalla versione consolidata `phase-5c-pb-v2`: una singola query restituisce una sola cella JSON con:

- `classification.status` (`PASS`, `FAIL` o `ALREADY_APPLIED_OR_HISTORY_COLLISION`), count e blocking reasons;
- target e migration history completa;
- dipendenze, colonne, candidate key, ruoli e collisioni 5C;
- metadata baseline essenziali per tabelle, colonne, constraint, indici, policy, grant, trigger/function e view.

Le collisioni sono fail-closed e richiedono confronto prima dell'apply. Il report resta racchiuso tra `BEGIN TRANSACTION READ ONLY` e `ROLLBACK`, senza DDL/DML. È stato eseguito con successo su PostgreSQL 16.15 locale contro uno schema sintetico con migration history: un solo result set JSON, report version e classification presenti. Test repository: **300/300 unit test PASS**.

### Stato dopo il primo run

| Voce | Stato |
| --- | --- |
| Production interrogata | **SÌ — USER-REPORTED, read-only v1** |
| Production modificata | **NO** |
| Evidenza view baseline | **RICEVUTA / PARZIALE** |
| Preflight 5C | **NON CLASSIFICABILE — atteso rerun v2** |
| Collisioni/dipendenze/history | **NON DISPONIBILI dal result set copiato** |
| Migration 5C applicata | **NO** |
| Baseline migration | **NON CREATA** |
| Verifica umana richiesta | rieseguire v2 e copiare l'unico JSON |
