# FASE 3C-B4.3 — Transactional RPC runtime validation gate

## Esito

**BLOCKED — ISOLATED DATABASE NOT AVAILABLE.**

Non è stata applicata alcuna migration, non è stata invocata la RPC e non sono state eseguite connessioni o scritture remote. I risultati in questo documento sono un audit di repository e una revisione statica; **non equivalgono a una validazione runtime**.

L'ambiente remoto resta `POTENTIALLY PRODUCTION — WRITES FORBIDDEN WITHOUT EXPLICIT APPROVAL`. B4 resta **IN PROGRESS** e B4.4 non è iniziata.

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

## Disponibilità ambiente isolato

Nel workspace non risultano disponibili:

- Supabase CLI;
- `supabase/config.toml`;
- Docker o Podman;
- client/server PostgreSQL (`psql`, `postgres`, `initdb`, `pg_ctl`);
- metadati di un Supabase Preview Branch o Staging dimostrabilmente separato.

Non è quindi possibile creare un database temporaneo, applicare la history completa e verificare realmente funzione, grants, RLS, trigger e rollback. Non sono stati tentati download di tooling, bootstrap infrastrutturali o connessioni remote.

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

La RPC aggiunge una verifica `profiles.user_id = auth.uid()`, accetta soltanto `athlete`/`staff`, usa `search_path = ''`, qualifica gli schemi, revoca `PUBLIC`/`anon` e concede execute ad `authenticated`. Non usa SQL dinamico, SECURITY DEFINER o service role e non introduce escalation visibile staticamente.

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
3. verifica ACL: authenticated execute, anon/public negati;
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

Predisporre uno degli ambienti isolati precedenti e rieseguire integralmente la matrice runtime. Fermarsi nuovamente prima di applicare la migration a Preview condivisa o Production. B4.4 resta non iniziata finché questo gate non è superato o non viene presa una decisione esplicita successiva.
