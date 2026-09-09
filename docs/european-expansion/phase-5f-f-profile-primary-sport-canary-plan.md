# FASE 5F-F — Review e procedura canary runtime Profile ed esperienze

Data: 2026-09-09
Stato: **DEPLOY PRODUCTION PASS — CANARY NON ESEGUITO; IDENTIFICAZIONE DISPOSABLE PENDING**

## Decisioni approvate

- I contratti runtime Profile ed esperienze sono approvati funzionalmente, ma non ancora verificati da scritture remote.
- Il canary userà esclusivamente un profilo di test dedicato e disposable. Il profilo reale osservato con `sport="Calcio"` e riferimenti canonici null è escluso.
- Non è previsto alcun ripristino amministrativo del profilo reale e non sarà eseguito alcun backfill.
- Il deploy Production autorizzato è concluso. Restano esclusi creazione remota dell'account, PATCH/PUT remoti, teardown e modifiche di schema finché non saranno autorizzati separatamente.

Il perimetro resta owner-scoped. Profile comprende soltanto `sport`, `sport_id`, `sport_discipline_id` e `sport_variant_id`; esperienze comprende una sostituzione atomica della lista del medesimo owner, preservando `club_name`, `sport`, `role`, `category`, `start_year` ed `end_year` e aggiungendo soltanto i tre riferimenti sportivi canonici. Rimangono invariati i codici opachi del contratto: 400 per input/riferimenti invalidi, 403 per divieto RLS e 500 per errore inatteso.

## Ambiente e revisione proposta

L'ambiente proposto è **Production**, non Preview: la migration 5F-A risulta applicata e registrata in Production, mentre Preview resta non verificato. Questa scelta riduce il rischio di eseguire codice contro uno schema sconosciuto, ma richiede un account Production deliberatamente sacrificabile e una finestra controllata.

Le revisioni runtime minime da distribuire sono `ad9862991d9d6d3c8992796c976601e6e3f917ea` per Profile e `c65da3e070c1274049b9ebc2382884fd10e7f909` per esperienze. Il precedente riferimento `72b8f1e...` non appartiene alla history Git corrente e non deve essere usato come gate. Prima del deploy l'operatore deve eseguire il verifier unico con il release commit effettivo e registrare lo SHA immutabile realmente distribuito; il piano non autorizza merge o deploy.

Il candidato verificato repository-only è `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`. **Checkpoint Codespace 2026-09-09 — PASS USER-REPORTED:** sul branch `codex/completare-il-gate-runtime-5f`, il comando `scripts/verify-phase-5f-runtime-release.sh 36dfa9860d9d12f5373ea3a85d76f706b4d718a4` ha restituito `PHASE_5F_RUNTIME_RELEASE_PASS commit=36dfa9860d9d12f5373ea3a85d76f706b4d718a4` e `RELEASE_VERIFY_EXIT_CODE=0`. La verifica non deve essere ripetuta prima del controllo provider, salvo cambio del candidato.

**Checkpoint deployment discovery 2026-09-09 — NEW DEPLOY REQUIRED.** Una lettura pubblica non autenticata di `https://www.clubandplayer.com/api/env` ha restituito `mode=production`, SHA distribuito `772a45bb6b279409da48ffb08ad39510bf359651` e host Supabase `izzfjrcabtixxsrnkzro.supabase.co`. Il repository locale conferma che lo SHA distribuito esiste ed è antenato del candidato, mentre il candidato non è antenato dello SHA distribuito: il deployment corrente precede entrambe le integrazioni runtime 5F e non è utilizzabile per il canary. `https://clubandplayer.com/api/env` effettua redirect permanente allo stesso host `www`. Non sono stati consultati secret, dashboard o database e non è stato eseguito alcun deploy.

Il prossimo passaggio proposto è un nuovo deployment **Vercel Production** del solo candidato immutabile `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`, destinato al progetto che serve `https://www.clubandplayer.com` e mantiene `NEXT_PUBLIC_SUPABASE_URL` sul project ref Production `izzfjrcabtixxsrnkzro`. Dopo il deploy, prima di qualunque canary, `/api/env` dovrà mostrare esattamente `mode=production`, quello SHA e lo stesso host Supabase. Il checkpoint di discovery non costituiva ancora autorizzazione a merge, deploy, promozione, migration o canary; l'autorizzazione successiva è registrata separatamente sotto.

**Checkpoint autorizzazione deploy 2026-09-09 — AUTORIZZATO / NON ESEGUITO.** L'utente ha autorizzato esclusivamente il deployment Vercel Production del candidato e della destinazione esatti riportati sopra, senza migration e senza canary. Il workspace di esecuzione non dispone però di collegamento `.vercel/project.json`, Vercel CLI/token, remote Git o sessione GitHub autenticata; non può quindi creare o promuovere il deployment. Nessun tentativo mutativo è stato effettuato e l'autorizzazione non viene estesa a commit diversi, merge, migration o canary.

Handoff minimo per l'operatore Vercel: aprire **Vercel Dashboard → progetto che serve `www.clubandplayer.com` → Deployments**, cercare il deployment il cui **Source commit** è esattamente `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`, aprirlo e scegliere **Promote to Production**. Prima della conferma controllare che la destinazione sia **Production** e che le Environment Variables Production includano `NEXT_PUBLIC_SUPABASE_URL` con host `izzfjrcabtixxsrnkzro.supabase.co`; non modificare variabili e non selezionare un deployment con SHA differente. Se lo SHA non compare nell'elenco, fermarsi senza creare deployment da un branch con HEAD differente. Dopo una promozione riuscita comunicare soltanto l'URL immutabile del deployment; URL canonico, ambiente, SHA e project ref verranno verificati dal relativo `/api/env` prima di qualsiasi canary.

**Checkpoint post-deploy dominio canonico 2026-09-09 — PASS USER-REPORTED.** Dopo la promozione, `https://www.clubandplayer.com/api/env` ha restituito `hasUrl=true`, `hasAnon=true`, `mode=production`, SHA `36dfa9860d9d12f5373ea3a85d76f706b4d718a4` e host Supabase `izzfjrcabtixxsrnkzro.supabase.co`. URL canonico, ambiente, revisione e database collegato coincidono con il target autorizzato. Il deploy runtime 5F è concluso; build, deploy e migration non devono essere ripetuti. Questo PASS non autorizza il canary.

## Prossimo gate singolo — identificazione del disposable

Prima di token, snapshot o scritture, occorre identificare **un solo account Production già esistente**, creato esclusivamente per test e non riconducibile a una persona reale. Comunicare soltanto il suo `auth.users.id` UUID non sensibile e confermare nello stesso messaggio che è `athlete` oppure `staff`, disposable e non admin; non comunicare email, password, token o altri dati personali.

Dopo l'identificazione, il gate read-only qualificherà cardinalità owner, baseline Profile/esperienze, assenza di privilegi admin e mapping sportivo. Soltanto se il gate passa verrà richiesto separatamente il permesso per il seguente perimetro mutativo minimo: **un PATCH Profile**, **un PUT di sostituzione esperienze**, osservazioni read-after-write e **teardown del disposable**. Nessuna di queste scritture è autorizzata ora.

## Informazioni ancora strettamente necessarie

1. identificatore non sensibile dell'account disposable athlete/staff già creato tramite il normale flusso applicativo, con conferma che non appartenga a una persona reale e non sia amministratore;
2. token/sessione dell'account disponibile **solo come secret del Codespace**, mai riportato nel documento o nei log;
3. URL Production e identificatore immutabile del deployment — **PASS**;
4. una label legacy con mapping univoco attivo, oppure una catena canonicale attiva, verificata subito prima del test;
5. procedura già approvata per eliminare/disabilitare l'account disposable al termine.

La creazione dell'account e la sua eliminazione/disabilitazione sono operazioni remote distinte e richiedono autorizzazione esplicita.

## Prerequisiti fail-closed

1. stato repository e verifica delle revisioni/route — **PASS già registrato; non ripetere salvo cambio SHA**;
2. deployment provider e dominio canonico sullo SHA Production selezionato — **PASS già registrato**;
3. rieseguire il report read-only 5F-C: schema ready, history 5F-A pari a uno e nove trigger abilitati/invariati;
4. verificare che l'account canary athlete/staff possieda esattamente una riga `profiles`, non sia admin, non sia usato da persone reali e abbia già `sport` uguale alla label scelta con i tre ID null;
5. salvare fuori dai log lo snapshot dell'intera riga Profile, dell'intera lista esperienze e il conteggio delle notifiche del canary;
6. verificare mapping e catena attivi;
7. ottenere autorizzazioni esplicite per il PATCH Profile, il PUT esperienze e il teardown.

Qualunque mismatch è uno **STOP**. Non correggere schema, history, trigger o dati durante il canary.

## Comandi da preparare nel Codespace

I valori sensibili devono essere caricati come secret e l'history della shell disabilitata. Il payload proposto usa il client legacy, così verifica contemporaneamente compatibilità e proiezione canonicale.

```bash
set +o history
set -euo pipefail
export RELEASE_COMMIT='36dfa9860d9d12f5373ea3a85d76f706b4d718a4'
export PROD_BASE_URL='https://www.clubandplayer.com'
export CANARY_LEGACY_SPORT='<legacy-label-con-mapping-univoco-attivo>'
: "${CANARY_TOKEN:?caricare CANARY_TOKEN come secret del Codespace}"

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me" > /tmp/phase-5f-f-before.json

curl --fail-with-body --silent --show-error \
  -X PATCH \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  -H 'Content-Type: application/json' \
  --data "{\"sport\":\"$CANARY_LEGACY_SPORT\"}" \
  "$PROD_BASE_URL/api/profiles/me" > /tmp/phase-5f-f-patch.json

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me" > /tmp/phase-5f-f-after.json
```

Non usare `set -x`, non stampare il token e non committare i file `/tmp`. Il controllo negativo `invalid_reference` non è incluso nella singola write minima: richiederebbe un secondo PATCH, anche se dovrebbe fermarsi prima del database.

## Risultati attesi

- GET iniziale: una sola riga appartenente al canary;
- PATCH: HTTP 200, stesso `user_id`, legacy `sport` normalizzato e tre UUID canonicali coerenti/non null;
- GET finale: stessi quattro valori restituiti dal PATCH;
- nessuna risposta contiene messaggi Postgres, nomi di constraint o stack trace;
- inventario dei nove trigger invariato e nessuna riga Profile estranea modificata.

## Effetti oltre le quattro colonne

La route aggiunge sempre `updated_at` allo stesso `UPDATE`, quindi il timestamp cambia anche se il valore legacy inviato coincide con quello precedente. Inoltre tutti i nove trigger `profiles` si attivano secondo le rispettive condizioni:

- `set_updated_at` e `trg_profiles_updated_at` possono riscrivere ancora `updated_at`;
- `profiles_set_visibility_status` può ricalcolare `profile_visibility_status` quando cambia `sport`; il canary athlete/staff mantiene appositamente lo stesso valore legacy per esercitare il fast-path, mentre per altri account type non sarebbe garantito;
- `profiles_notify_draft_demotion` può produrre una notifica se la visibilità passa da published a draft;
- `profiles_sync_names` e `trg_profile_location_coerce` hanno guardie per input invariati nelle versioni repository;
- `enforce_single_platform_admin_profile` verifica comunque i segnali admin; il canary deve essere non admin;
- gli effetti reali di `trg_profiles_fill_default_role` e `trg_profiles_fill_role_for_fan`, e di ogni eventuale drift delle funzioni Production, non sono ricostruibili dagli stub locali.

Perciò prima e dopo il PATCH vanno confrontati almeno `updated_at`, `profile_visibility_status`, `role`, `account_type`, `type`, `is_admin`, nomi, campi location/moderazione e conteggio notifiche, oltre alle quattro colonne sportive. È accettato soltanto il cambio di `updated_at`; ogni altro side effect inatteso è **STOP** e va conservato come evidenza senza tentare correzioni.

## Criteri di arresto

Fermarsi senza retry se: schema/history/trigger divergono; l'account non è disposable o owner unico; mapping non univoco/inattivo; risposta diversa da 200; UUID null/incoerenti; errore con dettagli interni; modifica di un profilo estraneo; variazione inattesa di visibilità, ruolo, identità, location, moderazione o notifiche. Non eseguire reset sul profilo reale e non usare `supabase db push`, migration repair o SQL correttivo.

## Gestione finale del disposable

Dopo la raccolta delle evidenze, revocare la sessione e disabilitare o eliminare account e Profile usando esclusivamente la procedura ordinaria già approvata. Non usare il reset API come rollback e non tentare di ricostruire la baseline: il profilo è disposable. Se il teardown non è ancora autorizzato, revocare il token, marcare l'account come quarantinato e non riutilizzarlo; la fase resta aperta fino alla sua rimozione verificata.

## Esito della review e prossimo controllo

Il deploy è **PASS** e il canary resta **NOT AUTHORIZED / NOT EXECUTED**. Il prossimo e unico controllo concreto è ricevere l'UUID non sensibile di un account Production già esistente insieme alla conferma `athlete|staff`, disposable, non reale e non admin. Nessun token o altro dato è richiesto in questo passaggio; nessuna scrittura verrà eseguita prima del gate read-only e della successiva autorizzazione esplicita al perimetro Profile + esperienze + teardown.
