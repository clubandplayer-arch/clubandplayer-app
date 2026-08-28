# FASE 3C-B4.3 — Transactional RPC runtime validation gate

## Esito

**PARTIAL PASS — LOCAL POSTGRESQL 16 RUNTIME HARNESS PASSED; PREVIEW BRANCH UNHEALTHY; SUPABASE SUPPORT PENDING.**

Il 2026-08-26 la migration è stata applicata e la RPC è stata invocata esclusivamente in un database PostgreSQL 16 temporaneo locale, popolato con fixture sintetiche e distrutto al termine del test. Non sono state eseguite connessioni o scritture remote e la migration non è stata applicata a Preview, Staging o Production.

Il runtime locale certifica sintassi, firma, grants, `SECURITY INVOKER`, comportamento funzionale e atomicità sulle tabelle/policy rilevanti riprodotte. Il repository non contiene però una baseline Supabase locale completa e riproducibile: la compatibilità con l'intera migration history, i trigger reali e l'ambiente Supabase resta un gate separato. L'ambiente remoto resta `POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL`. B4 resta **IN PROGRESS** e B4.4 non è iniziata.

## Audit timestamp e ordine migration

Data dell'audit: **2026-08-25**.

| Controllo | Esito |
| --- | --- |
| Migration RPC | `20261204120000_transactional_profile_residence_rpc.sql` |
| Ultima migration precedente | `20261203120000_profile_canonical_geography.sql` |
| Migration datate dopo il 2026-08-25, esclusa la RPC | 21 |
| Collisione sul timestamp `20261204120000` | nessuna |
| Ordine lessicografico | RPC immediatamente dopo la foundation profile canonical geography |
| Rinomina | non necessaria |

Il timestamp è futuro rispetto alla data corrente, ma non è isolato né arbitrario rispetto alla cronologia del repository: prima della RPC sono già presenti migration da settembre a dicembre 2026 e la sua dipendenza diretta è datata `20261203120000`. `20261204120000` è stato scelto come primo giorno logico successivo alla migration che crea `residence_geo_area_id` e `profile_geo_area_interests`, mantenendo l'ordinamento dipendenze. Rinominare la RPC al 25 agosto la collocherebbe prima della struttura da cui dipende e sarebbe errato.

È presente una collisione preesistente e non correlata su `20260720103000` (`normalize_pallavolo_to_volley.sql` e `seed_players_from_excel.sql`). Non coinvolge la nuova RPC, ma deve essere considerata in un futuro audit generale della migration history. Non è stata corretta perché fuori scope e storica.

## Ambiente isolato locale e limite di fedeltà

All'inizio del controllo non risultavano disponibili Supabase CLI, Docker/Podman o PostgreSQL. È stato installato PostgreSQL 16 nel solo container di lavoro ed è stato creato un database temporaneo locale senza configurare alcun host remoto.

Il banco prova riproducibile è composto da:

- `scripts/test-profile-residence-rpc-runtime.sh`;
- `tests/integration/sql/profile-residence-rpc-runtime-setup.sql`;
- `tests/integration/sql/profile-residence-rpc-runtime-tests.sql`.

Il setup riproduce ruoli `anon`/`authenticated`, `auth.uid()`, tabelle, foreign key, grants e policy RLS direttamente rilevanti per la RPC. Non riproduce l'intero stack Supabase né tutte le 117 migration: la history contiene dipendenze da `auth`, `storage`, configurazioni e uno schema base non integralmente ricostruibile dai soli file presenti. Per questo il test locale è una validazione runtime reale ma mirata, non la certificazione Supabase finale.

## Risultati runtime locali del 2026-08-26

**PASS — 0 errori residui nel banco prova.** Sono stati verificati:

- creazione della funzione, firma `uuid, uuid → jsonb`, `SECURITY INVOKER`, `search_path` vuoto e grants;
- anonimo negato; Player/Athlete e Staff owner consentiti; Club, Fan e Institution negati; identità senza profilo negata;
- UUID invalido, country unsupported/inactive, area mancante, country/area mismatch e ancestor inattivo;
- reset, country-only e preferences inizialmente assenti;
- full IT con mapping 1:1; mapping mancante e ambiguo negati;
- FR, ES, CH con District, CH senza District, SI e PL con proiezione testuale e ID legacy italiani null;
- interests, birth country, nationality e relocation invariati;
- rollback del write `profiles` quando fallisce `profile_preferences` e assenza di mutazione preferences quando fallisce `profiles`;
- risultato canonical-first coerente con i valori persistiti.

Il database e tutte le fixture erano sintetici; il runner elimina il database al termine.

## Preview Branch `b4-rpc-validation` — support pending

Il Preview Branch dedicato è stato creato, ma il workflow di ricostruzione della migration history è fallito:

| Voce | Stato verificato |
| --- | --- |
| Branch | `b4-rpc-validation` |
| Health | `UNHEALTHY` |
| Workflow step | `MIGRATIONS: FAILED` |
| Timestamp dashboard | `2026-08-26 10:55:32` |
| Migration manuale B4 | non applicata |
| GitHub/Vercel | non collegati |
| Production | non modificata |

Il dashboard `Manage Branches → View Logs` mostra esclusivamente la riga fallita e non apre dettagli. Un controllo read-only con browser DevTools ha confermato che il click su `MIGRATIONS: FAILED` non genera alcuna richiesta per endpoint `actions` o workflow `logs`. Non è pertanto possibile attribuire il fallimento a una migration specifica o a un errore SQL verificato.

È stato deciso di contattare il supporto Supabase e mantenere temporaneamente il branch per consentire l'analisi. Fino alla risposta del supporto sono vietati retry, reset, merge, applicazioni manuali della migration, query remote e modifiche Production. B4.4 resta **NOT STARTED**.

## Revisione SQL statica

### Firma e tipi

La funzione riceve soltanto due parametri `uuid` nullable e restituisce `jsonb`. Il tipo UUID delega a PostgreSQL/PostgREST il rifiuto sintattico prima dell'esecuzione. Non esistono `profile_id` o JSON di input controllabili dal client.

### SECURITY INVOKER e RLS

La scelta `SECURITY INVOKER` è coerente staticamente con:

- policy `profiles update self` basata su `user_id = auth.uid()`;
- policy `profile_preferences` owner-or-admin per select/insert/update;
- policy authenticated-read su `legacy_geo_area_mappings`;
- lettura cataloghi countries/geo areas;
- grant Data API espliciti alle tabelle RLS creati dalla migration `20261113110000_data_api_explicit_grants.sql`.

La RPC aggiunge una verifica `profiles.user_id = auth.uid()`, accetta soltanto `athlete`/`staff`, usa `search_path = ''`, qualifica gli schemi, revoca `PUBLIC`/`anon`/`authenticated`; la migration separata `20261204122000_enable_profile_residence_rpc.sql` concede execute ad `authenticated` soltanto dopo un gate esplicito. Non usa SQL dinamico, SECURITY DEFINER o service role e non introduce escalation visibile staticamente.

**Gate runtime:** la compatibilità effettiva dipende dal fatto che migration, grants e policy siano realmente presenti nello stesso stato nel database isolato/target. Questo non è verificabile dal solo repository.

### Catena, mapping e semantiche

La funzione controlla country supported/active, area active, country su ogni ancestor, ciclo, profondità e ancestor mancante. Reset e country-only non attraversano aree e azzerano i soli legacy residence. Full foreign proietta label e lascia null gli ID Italia. Full IT richiede mapping per ogni livello.

La revisione ha individuato e corretto un problema statico nella prima versione: il conteggio dei mapping Italia filtrava preventivamente gli ID legacy non numerici. Una area con un mapping valido e uno non valido avrebbe potuto apparire falsamente 1:1. Ora la funzione:

1. conta **tutti** i mapping della coppia area/entity;
2. rifiuta più di un record come ambiguo;
3. valida separatamente tutti gli ID con `bool_and`;
4. effettua il cast soltanto per ID positivi con massimo 18 cifre.

### Atomicità e rollback

Update `profiles` e upsert `profile_preferences` sono nella stessa invocazione PL/pgSQL e non esistono exception handler o commit intermedi. Staticamente, un errore non gestito annulla l'istruzione. `profile_preferences` inizialmente assente è coperta da insert/on-conflict.

**Gate runtime:** devono ancora essere provocati realmente un errore profiles e un errore preferences e deve essere verificato che nessuna tabella conservi uno stato parziale.

### Constraint e trigger

La FK composita esistente protegge la coerenza `(residence_geo_area_id, residence_country_id)`. L'update di `profiles` attiva i trigger esistenti di visibility/status e possibili trigger Production non tracciati. In particolare `municipality_sync_region()` e `profile_location_coerce()` erano già classificati come non trovati nel repository: la loro eventuale presenza e interazione nel database target è un blocker runtime. Il trigger di visibility tracciato può ricalcolare lo stato profilo e l'after-trigger di demotion può notificare; per athlete/staff la completezza tracciata non dipende dalla residence, ma il comportamento reale deve essere verificato in isolamento.

## Matrice runtime ancora obbligatoria

In un database isolato con schema/migration history equivalente eseguire, senza dati personali:

1. applicazione completa fino alla migration RPC;
2. verifica `pg_proc` di firma e `prosecdef = false`;
3. verifica ACL prima dell'attivazione: authenticated/anon/public negati; applica localmente la migration di attivazione e verifica authenticated execute con anon/public negati;
4. sessione anonima negata;
5. owner Athlete consentito;
6. owner Staff consentito;
7. Club, Fan e Institution negati;
8. tentativo di profilo altrui negato;
9. UUID invalido rifiutato;
10. country unsupported/inactive, area assente, mismatch e ancestor incoerente;
11. reset e country-only;
12. full IT, mapping mancante e mapping ambiguo;
13. FR, ES, CH con District, CH senza District, SI e PL;
14. preferences inizialmente assente;
15. errore forzato su profiles con rollback;
16. errore forzato su preferences con rollback del profiles update;
17. conferma invariata di interests, birth country, nationality e relocation;
18. risultato read-after-write canonical-first.

## Ambiente necessario

È sufficiente uno dei seguenti, purché sia dimostrabilmente separato da Production:

1. Supabase CLI + Docker con `supabase/config.toml` e database locale resettabile;
2. PostgreSQL temporaneo locale compatibile, con schema `auth`, funzione simulata `auth.uid()`, ruoli `anon`/`authenticated` e migration history completa;
3. Supabase Preview Branch dedicato e distruttibile;
4. progetto Supabase Staging separato, con project ref differente da Production.

La scelta raccomandata è Supabase locale; in alternativa un Preview Branch Supabase dedicato. Una Preview Vercel non dimostra la separazione del database.

## Come verificare Branching/Staging senza condividere secret

1. Nel dashboard Supabase aprire il progetto e verificare se è disponibile la sezione **Branches/Branching**. Deve esistere un branch non-Production identificabile separatamente; annotare privatamente soltanto il suo project ref.
2. Se Branching non è disponibile, verificare nell'organizzazione Supabase se esiste un progetto Staging separato. Il suo project ref deve differire da quello Production.
3. In Vercel aprire **Project → Settings → Environment Variables**, cercare `NEXT_PUBLIC_SUPABASE_URL` e confrontare internamente i valori scoped **Preview** e **Production**.
4. Da ciascun URL considerare soltanto il project ref nel nome host. Non copiare URL, key o token nella conversazione.
5. Confrontare i due ref con quelli mostrati nelle impostazioni dei rispettivi progetti/branch Supabase:
   - ref Preview diverso e corrispondente al branch/staging → separazione plausibile;
   - ref uguale → Preview Vercel usa Production;
   - valore non visibile o corrispondenza incerta → mantenere `POTENTIALLY PRODUCTION`.
6. Verificare anche che **tutte** le variabili Supabase scoped Preview puntino allo stesso branch/staging; non è sufficiente cambiare soltanto l'URL pubblico.

Non inviare key, token, password o service role key. Per sbloccare il gate basta comunicare: “Branch/Staging separato confermato, project ref Preview diverso da Production”, senza riportare i ref.

## Prossimo passo

Attendere che il supporto Supabase fornisca il primo file migration fallito e il relativo errore SQL, oppure ripristini l'accesso ai workflow logs. Non eseguire retry, merge, reset, query o migration manuali nel frattempo. Questo era il gate storico del Preview Branch; il percorso Production manuale successivamente autorizzato mantiene B4.4 **IN PROGRESS** e non autorizza B5.

## Estensione database canary

Il runtime aggiornato applica nell'ordine RPC, trigger guards, `20261204121500_profile_residence_database_canary.sql`, membership sintetiche, trigger pertinenti, verifica RPC disabilitata e infine attivazione esclusivamente locale. Verifica RLS, visibilità della sola membership propria, assenza dei privilegi di gestione per `authenticated`, successo Player/Staff allowlisted e rifiuto senza scritture di un Athlete non allowlisted. Gli UUID delle membership runtime sono sintetici e non sono valori Production.


### Esecuzione canary locale 2026-08-27

PostgreSQL 16.15 è stato installato esclusivamente nel container locale autorizzato. La prima esecuzione ha rilevato una lacuna di fixture: il caso “utente senza profilo” non aveva membership canary e veniva correttamente respinto dal nuovo gate prima di raggiungere l'asserzione `profile not found`. Sono stati aggiunti al solo harness un utente Auth sintetico e la relativa membership, senza creare un profilo. Dopo la correzione, l'intero harness ha restituito **B4_RPC_RUNTIME_PASS**: RLS/ACL canary, Athlete non allowlisted senza scritture, Player/Staff, gerarchie, trigger, side effect e rollback sono passati. Il trap ha eliminato `b4_rpc_runtime`; la verifica finale ha restituito zero database residui. Nessuna connessione o query remota è stata eseguita.
