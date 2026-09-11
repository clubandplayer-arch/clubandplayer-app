# FASE 6 — Verifica isolamento Preview e smoke Calcio a 7

Data: 2026-09-11  
Target dichiarato: Supabase `fase6-github` (`jbovlevodfouwuvtdlja`) e Vercel Preview del branch `codex/implementare-categorie-sportive-per-paesi`.  
Stato: **ISOLAMENTO RUNTIME GET-ONLY PASS; SMOKE MUTATIVI NON ESEGUITI**.

## Evidenze ricevute

L'operatore dichiara Supabase Preview Healthy, ultima migration `add_seven_a_side_football_variant`, cinque variabili Vercel Preview allineate al project ref Preview e GitHub `Deploy to production` disabilitato. Queste sono evidenze user-reported, non una certificazione runtime dell'agente. La migration C7 è già applicata e non deve essere ripetuta.

## Verifiche effettive

Richieste HTTP senza credenziali a `/`, `/api/env`, `/api/sports/catalog` e `/api/auth/whoami` hanno tutte ricevuto `302` verso `vercel.com/sso-api`. È quindi confermata la Deployment Protection, ma non sono osservabili commit, `VERCEL_ENV`, project ref browser/server o catalogo. Il project Supabase Preview risponde sul proprio host, ma senza `apikey` restituisce correttamente `401`; nessuna chiave è presente nell'ambiente agente.

L'audit repository non trova URL Supabase hardcoded nei client interessati: browser usa `NEXT_PUBLIC_SUPABASE_URL`; server preferisce `SUPABASE_URL` e può ripiegare sulla variabile pubblica. È stato reso più sicuro `/api/env`: ora restituisce soltanto project ref pubblico/server, origine dell'URL server, uguaglianza delle anon key, presenza booleana della service-role, SHA e modalità. Non restituisce URL completi, chiavi o token.

## Gate prima del bypass (stato storico)

| Gate | Esito |
|---|---|
| deployment effettivo e SHA | RISOLTO DAL GATE — `036f13d3d39c40efbc2910937e20533efd7d7fe1` |
| build successiva alle cinque variabili | PASS — nuovo deployment successivo a `e5f8a4a` |
| browser ref = server ref = `jbovlevodfouwuvtdlja` | PASS — `/api/env` autenticato |
| credenziali anon coerenti | PASS — diagnostica e catalogo GET |
| service-role valida per il project Preview | PASS — registry GET senza corrispondenze |
| `seven_a_side` e mapping remoto | PASS — catalogo GET |
| Apple Auth Preview | config repository corretta; runtime non verificato |
| smoke C7 read/save/reload | NOT EXECUTED — fuori dal perimetro GET-only autorizzato |
| regressione selector esistenti | test repository PASS; browser Preview non eseguito |

## Deployment candidato iniziale e corrispondenza commit (stato storico)

Vercel mostra come Ready il deployment Preview `e5f8a4a`, con titolo `chore: gate Phase 6 smoke on Preview isolation`. Il checkout di verifica contiene lo stesso titolo ma ha SHA completo `bfc8864434fd63af1d7c2929ae75c5107e679ebe`. Titolo e contenuto atteso sono compatibili, ma due SHA differenti non costituiscono una corrispondenza Git dimostrata; inoltre questo checkout non ha un remote Git configurato con cui risolvere `e5f8a4a`. Non è richiesto un redeploy soltanto per questa differenza: il gate deve usare lo SHA effettivamente mostrato da Vercel (`e5f8a4a`) e verificare che quel deployment esponga la nuova forma sicura di `/api/env`. Se il campo `sha` non inizia con `e5f8a4a`, selezionare il deployment Ready corretto oppure fare Redeploy dell'ultimo commit del branch dopo le variabili.

## Solo intervento manuale indispensabile

Nel progetto Vercel aprire **Settings → Deployment Protection → Protection Bypass for Automation**, scegliere **Add Secret** (nome suggerito: `phase-6-preview-verification`) e copiare il valore una sola volta. Il bypass è di progetto e quindi può aprire tutti i deployment protetti del progetto: non è tecnicamente limitabile al solo deployment; va revocato subito dopo gli smoke. Non disabilitare la protezione e non usare il secret come query string.

Per un task **Codex Cloud**, aprire [Codex settings → Environments](https://chatgpt.com/codex/settings/environments), selezionare l'ambiente associato a questo repository e aggiungere `VERCEL_AUTOMATION_BYPASS_SECRET` fra le **Environment variables**, non fra i Secrets: la documentazione Codex specifica che i Secrets sono rimossi prima della fase agente, mentre le Environment variables restano disponibili durante il chat. Salvare, avviare un nuovo task/follow-up nello stesso ambiente (o resettarne la cache se richiesto) e rimuovere la variabile appena terminata la verifica. Non inserirla nelle Environment Variables del progetto Vercel applicativo, in `.env*`, nel repository, nei comandi, nei log o in chat: è una credenziale temporanea del **client di verifica**, non dell'applicazione. Questa sessione già avviata non dispone di un canale che consenta all'utente di iniettare retroattivamente il valore nel processo.

Vercel raccomanda l'header `x-vercel-protection-bypass`; lo script repository-only [`scripts/verify-phase-6-preview-isolation.sh`](../../scripts/verify-phase-6-preview-isolation.sh) lo usa senza stampare il valore. Esecuzione dopo l'iniezione:

```bash
PHASE6_EXPECTED_DEPLOYMENT_SHA=e5f8a4a scripts/verify-phase-6-preview-isolation.sh
```

Lo script esegue esclusivamente tre GET: diagnostica ambiente, catalogo sportivo e una ricerca registry deliberatamente senza corrispondenze. Verifica Preview/ref/SHA/coerenza delle credenziali, presenza remota di `seven_a_side` e del mapping `Calcio a 7`, e validità read-only della service-role; non stampa payload, URL Supabase o credenziali. Non segue redirect: un bypass errato fallisce senza inoltrare l'header al login SSO.

Dopo lo sblocco, ripetere prima i GET. Gli smoke con salvataggio possono iniziare soltanto se `/api/env` mostra `mode=preview`, lo SHA atteso, entrambi i project ref uguali a `jbovlevodfouwuvtdlja`, `serverUrlSource=SUPABASE_URL`, `projectRefsMatch=true`, `anonKeysMatch=true` e `serviceRoleConfigured=true`. Servirà poi un account di test Player/Club disponibile sulla sola Preview; non crearne uno Production.

## Confini

Nessun salvataggio, account, migration, query mutativa, reset o teardown remoto è stato eseguito. Nessun accesso a Production. L'intera FASE 6 non è conclusa.

## Esito runtime dopo bypass

Il 2026-09-11 il bypass è risultato disponibile nell'ambiente senza esporne il valore. L'URL stabile del branch ha risolto il deployment Preview con SHA `036f13d3d39c40efbc2910937e20533efd7d7fe1`, successivo al candidato `e5f8a4a`. Il gate [`scripts/verify-phase-6-preview-isolation.sh`](../../scripts/verify-phase-6-preview-isolation.sh) ha restituito `PHASE6_PREVIEW_READ_ONLY_GATE_PASS`:

- `mode=preview`;
- project ref browser e server entrambi `jbovlevodfouwuvtdlja`;
- sorgente server `SUPABASE_URL`, senza fallback;
- anon key pubblica/server coerenti e service-role configurata;
- lettura server anon del catalogo riuscita con variante `seven_a_side` e mapping `Calcio a 7`;
- lettura registry deliberatamente senza corrispondenze riuscita tramite il client service-role.

Sono state eseguite esclusivamente richieste GET. Il bypass e la relativa Environment variable possono essere revocati/rimossi adesso; per i successivi smoke browser con salvataggio servirà un nuovo accesso temporaneo esplicitamente autorizzato.

## Smoke browser con account dedicato — procedura autorizzata

Stato al 2026-09-11: **PENDING USER-OPERATED BROWSER**. Il bypass è stato revocato e non è più presente nell'ambiente agente; il branch URL risponde nuovamente `302` a un client non autenticato. Non è quindi possibile riconfermare dall'automazione il deployment corrente né creare l'account. Un operatore che appartiene al team Vercel può invece eseguire lo smoke direttamente dal browser dopo il login Vercel: non serve ricreare il bypass.

### 1. Riconferma isolamento prima della prima write

1. Nella dashboard Vercel aprire il deployment **Ready** più recente del branch `codex/implementare-categorie-sportive-per-paesi` e annotarne soltanto lo SHA.
2. Nello stesso browser autenticato Vercel aprire l'URL del branch seguito da `/api/env`.
3. Non procedere se il JSON non mostra contemporaneamente: `mode: "preview"`, `sha` uguale al deployment Ready, `publicProjectRef` e `serverProjectRef` uguali a `jbovlevodfouwuvtdlja`, `serverUrlSource: "SUPABASE_URL"`, `projectRefsMatch: true`, `anonKeysMatch: true` e `serviceRoleConfigured: true`.
4. Non copiare cookie, header, chiavi o token nel report. Sono sufficienti SHA, project ref e PASS/FAIL dei booleani.

### 2. Account test esclusivamente Preview

Riutilizzare un account Player dedicato già presente in Preview oppure, nella dashboard del progetto Supabase **`fase6-github` (`jbovlevodfouwuvtdlja`)**, aprire **Authentication → Users → Add user → Create new user**, usare un indirizzo test controllato, una password conforme alla policy e marcare l'email come confermata. Questa creazione manuale evita che un link email utilizzi accidentalmente una redirect URL non verificata. Non creare l'utente nel progetto Production. Accedere quindi all'app Preview da `/login`; se richiesto, scegliere **Player** in `/onboarding/choose-role`.

### 3. Ordine, ruoli, save e reload

1. Aprire `/player/profile`, DevTools → **Network**, attivare **Preserve log** e filtrare `profiles/me`; non esportare HAR perché contiene cookie/header di sessione.
2. Nel menu Sport verificare la sequenza contigua **Calcio a 8 → Calcio a 7 → Futsal**.
3. Selezionare **Calcio a 7** e verificare che il menu Ruolo mostri: `Portiere`, `Difensore Centrale`, `Esterno Basso`, `Regista`, `Esterno Alto`, `Punta Centrale`.
4. Selezionare un ruolo e compilare soltanto gli altri campi obbligatori indicati dal form. Lasciare vuota l'esperienza passata iniziale; non creare dati aggiuntivi non necessari.
5. Premere **Salva profilo** una sola volta e verificare risposta `2xx` della `PATCH /api/profiles/me` e messaggio di salvataggio riuscito.
6. Nel Request Payload della PATCH verificare `primarySport.legacySport: "Calcio a 7"` e identificativi `sportId`, `disciplineId`, `variantId` tutti non vuoti. Non riportare i cookie o gli header Authorization.
7. Ricaricare completamente la pagina. Verificare che Sport sia ancora **Calcio a 7** e il ruolo sia invariato; nella nuova `GET /api/profiles/me` verificare `sport: "Calcio a 7"` e gli stessi `sport_id`, `sport_discipline_id`, `sport_variant_id` restituiti dalla PATCH.
8. Controllo regressivo non mutativo: riaprire il menu Sport e verificare che gli sport esistenti siano ancora presenti e che selezionando temporaneamente Calcio a 8 o Futsal i rispettivi ruoli non siano vuoti; tornare a Calcio a 7 senza salvare nuovamente.

### 4. Report minimo e teardown

Riportare: SHA Preview; PASS/FAIL isolamento; PASS/FAIL ordine; lista ruoli osservata; status HTTP PATCH; PASS/FAIL persistenza dopo reload; PASS/FAIL uguaglianza legacy/canonical IDs; eventuale messaggio d'errore testuale. Al termine fare logout. L'account test può restare identificato come test nella sola Preview per regressioni successive oppure essere eliminato da Authentication → Users soltanto dopo aver annotato l'esito; non eseguire alcun teardown su Production.

## Blocco login Preview rilevato

Stato al 2026-09-11: **GOOGLE OAUTH BLOCKED / EMAIL-PASSWORD TEST ACCOUNT REQUIRED**. Lo screenshot dell'operatore mostra `400 redirect_uri_mismatch` emesso da Google: la richiesta raggiunge Google, ma il redirect OAuth inviato da Supabase Preview non è autorizzato nel relativo client Google. Inoltre gli utenti Auth di Production non vengono copiati automaticamente nel nuovo branch Supabase; le credenziali di un utente Production non attestano quindi un guasto del login Preview.

Per sbloccare **subito il solo smoke C7**, non modificare il client Google condiviso: creare l'utente dedicato in **Supabase Preview `fase6-github` → Authentication → Users → Add user**, confermare l'email e usare il form **email/password** di `/login`, non il pulsante Google. Se anche questo percorso fallisce, annotare il messaggio mostrato e lo status delle sole richieste `/auth/v1/token` e `/api/auth/session`, senza copiare request/response body o header.

La registrazione email dall'app è stata corretta affinché `emailRedirectTo` usi sempre `window.location.origin`; una variabile `NEXT_PUBLIC_BASE_URL` condivisa non può più rimandare un'iscrizione Preview a Production. Questo fix richiede il deployment Preview del nuovo commit prima di usare `/signup`; la creazione diretta dalla dashboard Supabase Preview non dipende dal redeploy.

La sistemazione di Google OAuth è separata e manuale: creare preferibilmente un OAuth 2.0 Client dedicato alla Preview oppure, se la governance consente un client condiviso, aggiungere fra gli **Authorized redirect URIs** del client Google esattamente il `redirect_uri` mostrato nei dettagli dell'errore. Per questo branch deve normalmente essere `https://jbovlevodfouwuvtdlja.supabase.co/auth/v1/callback`. Configurare poi client ID e secret esclusivamente in **Supabase Preview → Authentication → Providers → Google** e aggiungere l'URL Vercel Preview `/auth/callback` in **Supabase Preview → Authentication → URL Configuration → Redirect URLs**. Non mettere il Google client secret nel repository o in chat e non cambiare la configurazione Auth Production. Lo smoke C7 non deve attendere questa integrazione social.

## Primo smoke mutativo — BLOCKED

Riscontri reali comunicati dall'operatore il 2026-09-11:

- login email/password: PASS;
- ordine `Calcio a 8 → Calcio a 7 → Futsal`: PASS;
- sei ruoli C7: PASS;
- salvataggio profilo: FAIL con `profile_primary_sport_write_failed`;
- Regione/Provincia/Città: liste vuote;
- club predefiniti nelle esperienze: assenti;
- esperienza C8: il campo Categoria espone ancora `CSEN`.

Il nuovo tentativo sul deployment `be64af05af6d692be7c8b0145a8b876779a2c323` ha mostrato ancora il solo codice generico: questo dimostra che il planning canonico è terminato e che l'errore proviene da uno dei due rami di mutation (`update` oppure fallback `upsert`), che non erano ancora strumentati. La diagnostica è stata quindi centralizzata su tutti e tre gli stadi `plan`, `update` e `upsert`. Il route associa un `traceId` e registra lato server soltanto stadio, codice database e messaggio limitato con email/UUID redatti. Esclusivamente quando `VERCEL_ENV=preview`, risposta e form mostrano anche questi valori già redatti; Production continua a ricevere soltanto codice stabile e trace. Dopo il prossimo deploy, una singola riproduzione minima C7/Portiere identificherà il ramo e la causa senza condividere Function Logs o payload. Il profilo applicativo va verificato nello stesso momento: `GET /api/profiles/me` deve restituire una riga con `user_id` dell'utente Auth e `account_type=athlete`; non basta la sola presenza in Authentication.

Le liste geografiche e dei club sono vuote perché il replay Preview ricostruisce lo **schema**, ma non importa dataset Production: la baseline crea `regions`, `provinces`, `municipalities` e `registry_clubs_master`, mentre l'import Campania viene saltato se manca lo staging. Non è corretto copiare il dataset Production. È stato preparato [`supabase/preview-fixtures/phase-6-minimal-profile-smoke.sql`](../../supabase/preview-fixtures/phase-6-minimal-profile-smoke.sql), fixture manuale e idempotente esterna alla migration history, con una gerarchia geografica sintetica e due club fittizi distinti C7/C8; non crea utenti o profili.

`CSEN` nel campo Categoria dell'esperienza C8 è una limitazione legacy attesa: l'attuale `CATEGORIES_BY_SPORT` mescola ancora organizzatore e categoria. La separazione `Sport → Ente → competizione/categoria` è definita dagli artefatti 6C-bis ma non è ancora integrata nella UI/runtime; non va considerata corretta semanticamente né usata come prova del nuovo catalogo.

Ordine della prossima verifica: (1) deploy del trace sicuro; (2) riconferma isolamento; (3) `GET /api/profiles/me` e correlazione del profilo; (4) PATCH minima con soli C7/Portiere; (5) reload; (6) solo dopo PASS, PATCH separata delle esperienze; (7) applicazione facoltativa della fixture Preview per verificare geografia e club. Non rieseguire migration.

## Root cause confermata e repair

Sul deployment `7cad19aa66f8a45920f766b84ac8b06289bbdec9` la diagnostica completa ha restituito `update — PGRST204 — Could not find the 'birth_country' column of 'profiles' in the schema cache`. C7 e il planner non sono la causa: il form invia il contratto completo Profile Edit e la tabella `profiles` ricostruita dalla baseline vuota non conteneva `birth_country`. Questa e altre colonne Profile Edit esistevano prima dell'inizio dello storico versionato originale e non erano state incluse nella baseline di repair.

La correzione è la migration additiva [`20261211130000_complete_profile_edit_schema.sql`](../../supabase/migrations/20261211130000_complete_profile_edit_schema.sql): aggiunge con `if not exists` l'intero gruppo di campi Profile Edit pre-history ancora mancanti e richiede il reload dello schema PostgREST. Non modifica righe, non effettua backfill, non copia dati Production e non riesegue la migration C7. Sul branch GitHub-linked viene applicata una volta dopo `add_seven_a_side_football_variant`; `Deploy to production` deve rimanere disabilitato.

Il prossimo smoke resta sequenziale: attendere Preview Healthy con ultima migration `complete_profile_edit_schema`, riconfermare `/api/env`, salvare C7/Portiere senza esperienze, ricaricare e confrontare legacy/ID; soltanto dopo testare una singola esperienza. La fixture geografica/club rimane separata da questo schema repair.

## Blocco migration history prima del repair

Il workflow collegato al branch si ferma prima di applicare `complete_profile_edit_schema` con `Remote migration versions not found in local migrations directory`. Questo messaggio indica una discordanza della tabella history Preview rispetto al checkout Git usato dal workflow; non autorizza a creare placeholder, marcare versioni come applicate, resettare o modificare una vecchia migration.

L'audit Git locale individua una rinomina effettiva: `20260720103000_normalize_pallavolo_to_volley.sql` è diventata `20260720102500_normalize_pallavolo_to_volley.sql` per eliminare la collisione con `20260720103000_seed_players_from_excel.sql`. La sola history Git non prova però che questa sia la versione remota orfana: il timestamp `20260720103000` continua a esistere localmente con un'altra migration, e possono esserci versioni applicate da commit intermedi non presenti nel checkout corrente.

È pronto il report [`phase-6-preview-migration-history-audit-read-only.sql`](../../scripts/sports/reports/phase-6-preview-migration-history-audit-read-only.sql). Incorpora l'elenco esatto dei file correnti, legge `supabase_migrations.schema_migrations`, restituisce in un'unica cella JSON `remoteOnly`, `localOnly`, nomi discordanti, coda remota e presenza effettiva delle colonne Profile Edit, ed esegue `BEGIN TRANSACTION READ ONLY` più `ROLLBACK`. Non effettua alcuna repair. L'ambiente agente non possiede una connessione Preview autenticata né accesso al repository GitHub privato, quindi il confronto remoto non può essere dichiarato eseguito dal solo log.

Solo dopo l'output del report si sceglierà fra: ripristino del vero file storico con contenuto verificato, ripristino del timestamp/nome corretto, oppure una repair limitata della history Preview dopo aver provato che gli effetti SQL esistono. `complete_profile_edit_schema` resta pending fino a quel confronto.

## Esito dell'audit history Preview

Audit eseguito dall'operatore su `fase6-github` (`jbovlevodfouwuvtdlja`): `remoteOnly=[]`, `sameVersionDifferentName=[]` e unica voce `localOnly=20261211130000_complete_profile_edit_schema`. La coda remota termina correttamente con `20261211120000_add_seven_a_side_football_variant`; tutte le colonne introdotte dalla migration successiva, salvo `club_motto` già esistente, risultano ancora assenti. Non esiste quindi alcuna history Preview da riparare e non sono autorizzati `migration repair`, reset o placeholder.

Il file pending è tracciato nel commit, non è ignorato e si trova nel percorso standard `supabase/migrations`. Applicando lo stesso algoritmo di riconciliazione della CLI (versioni remote e filename locali ordinati lessicograficamente), lo storico verificato produce una sola migration pending e nessuna versione locale mancante. Il precedente messaggio `Remote migration versions not found in local migrations directory` non è riproducibile con il checkout corrente: prova che quel tentativo ha confrontato lo storico remoto con un checkout diverso/incompleto o con una lista locale non corrispondente, ma il log fornito non include lo SHA né le versioni dichiarate mancanti.

La correzione operativa resta il percorso automatico: pubblicare questo commit sul branch collegato e rieseguire il workflow, verificando che il checkout contenga `20261211130000_complete_profile_edit_schema.sql`. L'esito atteso è l'applicazione della sola `20261211130000`; account e dati di test restano invariati. Se il medesimo errore ricompare, prima di qualsiasi alternativa manuale occorrono dallo stesso run SHA del checkout e lista delle versioni mancanti prodotta dalla CLI. Nessuna applicazione SQL manuale è proposta finché il normale workflow non viene ritentato sul checkout identificato.

Il retry delle 12:57 ha restituito lo stesso errore senza esporre SHA o versioni. Poiché l'audit certifica per insieme e nome che remoto = locale meno la sola `20261211130000`, mentre la CLI confronta sequenze ordinate di versioni, il fallimento non è risolvibile con altri commit di retry. È predisposto il runbook manuale Preview-only [`20261211130000_apply_profile_edit_schema_preview.sql`](../../supabase/runbooks/manual/20261211130000_apply_profile_edit_schema_preview.sql). Prima di ogni DDL verifica testa C7, assenza della versione target e dipendenze geografiche; nella stessa transazione applica il contenuto canonico, verifica tutte le colonne e solo allora inserisce la versione/nome nella history. Qualunque errore causa rollback integrale. Non modifica righe applicative e non tocca Auth, account o fixture.

## Esito recovery manuale e gate PostgREST

L'operatore ha eseguito il runbook sul solo project ref Preview `jbovlevodfouwuvtdlja`; risultato dichiarato: versione `20261211130000`, nome `complete_profile_edit_schema`, stato `applied_and_effects_verified`. Schema e history Preview sono quindi coerenti e account/dati di test sono preservati. Questo PASS non risolve né chiude il problema separato del workflow GitHub automatico.

Prima del nuovo PATCH, il controllo browser minimo è un solo GET autenticato a `/api/profiles/me` con cache disabilitata. Deve restituire HTTP 200 e il payload `data` deve possedere le proprietà `birth_country` e `notify_email_new_message`; non occorre mostrare o copiare gli altri valori del profilo. Questo prova che il deployment raggiunge PostgREST dopo il reload e che la schema cache espone almeno una colonna precedentemente mancante e il campo booleano non-null. Solo dopo questo esito si riprova il salvataggio C7/Portiere senza esperienze.

## Smoke C7 riuscito e dipendenze read-only residue

L'operatore conferma PASS di salvataggio/rilettura C7 e di una singola esperienza con club fittizio. Restano tre superfici: Search fallisce esplicitamente con `permission denied for view athletes_view`; Who to follow restituisce HTTP 500; le API geografiche e il registry non hanno dati di riferimento visibili. Il feed vuoto non è classificato come errore.

La causa Search è una regressione riproducibile di grant: `players_view` e il wrapper `athletes_view` sono stati ricreati come `security_invoker`, preservando correttamente la RLS di `profiles`, ma la ricreazione ha eliminato i grant espliciti sulle view. Who to follow usa prima `profiles`/`follows`, poi `current_player_fan_vote_counts` e infine `athletes_view` quando trova candidati Player: è predisposto un audit separato, non basato sull'assunzione che il suo 500 abbia la stessa causa. Le tabelle legacy `regions`, `provinces`, `municipalities` risultano invece escluse dalla migration di grant generica perché prive di RLS: qui vanno distinti permesso di lettura e dataset vuoto.

La migration riproducibile `20261211140000_restore_public_read_contracts.sql` mantiene le view `security_invoker`, concede soltanto SELECT ad anon/authenticated, abilita RLS sulle tre tabelle geografiche e aggiunge policy esclusivamente SELECT. Non concede scritture e non usa service-role. Poiché il workflow automatico resta guasto, il corrispondente runbook manuale Preview verifica testa/versione/effect prima di registrare la history. La fixture Preview separata ora contiene una regione/provincia/comune, due registry club e due profili pubblici interamente sintetici senza utenti Auth.

Audit Preview eseguito: `profiles`, `follows` e `current_player_fan_vote_counts` hanno SELECT authenticated; `players_view`, `athletes_view`, `regions`, `provinces`, `municipalities` non lo hanno. Entrambe le view sono `security_invoker`; RLS sulle tre tabelle geografiche è disabilitata; conteggi regioni/province/comuni/registry sono tutti zero. Il runbook `20261211140000` copre esattamente la parte schema/permessi: grant SELECT view, RLS + sole policy SELECT e grant SELECT geo, con verifica finale anche per anon e authenticated. Non inserisce dati: gli zeri restano responsabilità della fixture separata. Il 500 suggerimenti resta da riprovare e correlare dopo grant e fixture, senza considerarlo già risolto.

Il runbook read-contract è ora user-reported PASS su `jbovlevodfouwuvtdlja`: `20261211140000 restore_public_read_contracts`, `applied_and_effects_verified`. Il passo successivo è esclusivamente la fixture `supabase/preview-fixtures/phase-6-minimal-profile-smoke.sql`. La fixture rifiuta l'esecuzione senza quella testa Preview, usa soltanto nomi e UUID sintetici deterministici, lascia `user_id` nullo e non aggiorna l'account, il profilo o l'esperienza dell'operatore. Restituisce conteggi verificabili per una regione, una provincia, un comune, due profili sintetici e due registry club. Dopo il suo PASS, Search, cascata e suggerimenti saranno test separati.

Fixture user-reported PASS su `jbovlevodfouwuvtdlja`: `fixture_applied_and_verified`, con una regione, una provincia, un comune, due profili sintetici e due registry club. Smoke browser coordinato: (1) Search `Preview C7 Test Player`, aspettando il profilo Player senza errore `athletes_view`; (2) Profile Edit, Paese Italia e cascata `Preview Test Region` → `Preview Test Province` → `Preview Test City`, senza salvare; (3) Feed, ricarica e `Riprova` su Chi seguire, aspettando almeno uno dei profili sintetici e nessun HTTP 500. Riportare i tre esiti insieme; un eventuale 500 resta da diagnosticare separatamente. I PASS C7 profilo/esperienza restano acquisiti.

Esito browser: Search PASS con un Player sintetico; cascata geografica e salvataggio profilo PASS; Who to follow resta FAIL HTTP 500 anche in `/discover`. Il 500 non riapre i PASS precedenti. Aggiunta diagnostica GET esclusiva Preview e priva di identificativi/messaggi DB raw, con stadi distinti `candidateProfiles`, `fanVoteCounts`, `athleteDisplay`, `clubVerification`, `complete`. Il prossimo controllo deve riportare soltanto HTTP status, codice pubblico, stadio ed errorCode da `/api/follows/suggestions?limit=4&debug=1`.

Diagnostica runtime ricevuta: `500`, `RLS_DENIED`, stadio `viewerGeography`, PostgreSQL `42501`. Il fallimento precede candidati, fan counts e `athletes_view`: non è quindi la regressione view già corretta. `loadViewerSuggestionGeography` legge in parallelo `profile_preferences`, `profile_country_interests`, `profile_geo_area_interests`, quindi consulta eventualmente `countries` e `geo_areas`; serve identificare la relazione priva di SELECT senza ampliare permessi. Preparato audit read-only che restituisce per queste sole cinque dipendenze grant authenticated, RLS e numero di policy SELECT owner, senza leggere profili o interessi.

Audit viewer geography: unica anomalia `profile_geo_area_interests` con authenticated SELECT false; tutte le altre quattro relazioni sono true. RLS è attiva su tutte e cinque e ciascuna tabella privata ha una policy SELECT owner. La correzione minima `20261211150000_restore_profile_geo_area_interest_read.sql` concede soltanto SELECT ad authenticated sulla tabella identificata; non concede anon/DML e rifiuta di procedere se RLS o la policy owner mancano. Preparato runbook atomico Preview-only con gli stessi guard/effect check; Who to follow resta FAIL finché apply e retry runtime non passano.

Runbook `20261211150000_restore_profile_geo_area_interest_read` user-reported `applied_and_effects_verified` sulla Preview `jbovlevodfouwuvtdlja`. Il prossimo e unico controllo è ripetere il GET diagnostico autenticato `api/follows/suggestions?limit=4&debug=1`: PASS richiede HTTP 200, `ok=true`, almeno un suggerimento e presenza del Player sintetico; in caso di FAIL si riportano soltanto codice/stadio/errorCode. Nessuna nuova migration, fixture o scrittura è necessaria per questo retry.

Retry ricevuto: HTTP 200, `ok=true`, `count=1`, stadio `complete`, nessun codice errore. Il precedente 500 è quindi risolto; l'unico suggerimento valido è il Club sintetico. `hasSyntheticPlayer=false` è un difetto della fixture, non dell'endpoint: il nome `Preview C7 Test Player` contiene la cifra `7`, esclusa dalla validazione dei nomi persona, quindi il filtro di completezza lo scarta correttamente. La fixture è corretta idempotentemente in `Preview Test Player`, senza cambiare UUID/user_id e senza toccare l'account dell'operatore. Dopo il re-apply della sola fixture, un ultimo GET deve confermare il Player; i PASS preesistenti restano acquisiti.

Fixture corretta user-reported PASS con gli stessi conteggi. Smoke UI finale PASS: il suggerimento sintetico era visibile in Chi seguire, l'azione Segui è riuscita e il profilo è comparso in Profili che segui; l'assenza successiva dai suggerimenti è quindi il comportamento atteso di esclusione dei già seguiti. Il pacchetto smoke Preview C7 è chiuso per profilo, esperienza, Search, geografia, registry, suggerimenti e follow/reload. Nessun altro SQL o test browser è necessario ora. La FASE 6 complessiva non è chiusa: il workflow automatico migrations resta un blocker operativo separato e deve essere risolto prima di aggiungere/applicare nuove migration; 6D e Production non sono autorizzate.
