# FASE 5F-F — Review e procedura canary runtime Profile ed esperienze

Data: 2026-09-09
Stato: **QUALIFICAZIONE + DISPOSABLE PASS; CANARY AUTORIZZATO MA NON ESEGUITO**

## Decisioni approvate

- I contratti runtime Profile ed esperienze sono approvati funzionalmente, ma non ancora verificati da scritture remote.
- Il canary userà esclusivamente un profilo di test dedicato e disposable. Il profilo reale osservato con `sport="Calcio"` e riferimenti canonici null è escluso.
- Non è previsto alcun ripristino amministrativo del profilo reale e non sarà eseguito alcun backfill.
- Il deploy Production autorizzato è concluso. Il canary Profile/esperienze e il teardown ordinario sono autorizzati esclusivamente sull'account qualificato; modifiche di schema, altri account e retry fuori procedura restano esclusi.

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

Dopo l'identificazione, il gate read-only qualificherà cardinalità owner, baseline Profile/esperienze, assenza di privilegi admin e mapping sportivo. Il perimetro mutativo minimo successivamente autorizzato comprende **un PATCH Profile**, **un PATCH di sostituzione esperienze**, osservazioni read-after-write e **teardown del disposable**.

**Account proposto 2026-09-09 — IDENTIFICATO / QUALIFICAZIONE TECNICA PENDING.** L'utente indica `b5ba567a-194b-4e07-afe7-f8f9ce29a808` come Staff con ruolo legacy `Fotografo`. L'idoneità disposable/non reale non è ancora attestata e non viene inferita dal ruolo. Una lettura anonima del solo endpoint pubblico ha restituito una lista vuota, compatibile con un profilo non pubblicato ma insufficiente a provare esistenza, cardinalità, privilegi o baseline; la route owner-only esperienze ha correttamente risposto 401 senza sessione. Nessuna scrittura è stata tentata.

Il report `scripts/sports/reports/phase-5f-canary-account-qualification-read-only.sql` esegue in una transazione `READ ONLY` la sola qualifica tecnica richiesta: esistenza auth singola, un solo Profile Staff/Fotografo, assenza di segnali admin auth/Profile, canonical Profile null, conteggio e stato canonicale delle esperienze, e mapping legacy sportivo attivo/univoco/coerente. Non restituisce email, nomi, club o location e termina con `ROLLBACK`. Il PASS tecnico mantiene intenzionalmente `DISPOSABLE_ATTESTATION_PENDING`.

Questo workspace non dispone di una connessione Production e non può completare direttamente il report privilegiato. Eseguirlo nel Codespace che conserva `PRODUCTION_DATABASE_URL` come secret, senza stampare la URL:

```bash
set +o history
set -euo pipefail
: "${PRODUCTION_DATABASE_URL:?caricare il secret Production senza stamparlo}"
psql "$PRODUCTION_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v canary_user_id='b5ba567a-194b-4e07-afe7-f8f9ce29a808' \
  -f scripts/sports/reports/phase-5f-canary-account-qualification-read-only.sql
```

Il prossimo singolo dato necessario è la cella JSON `phase_5f_canary_account_qualification` completa. Qualunque classificazione diversa da `PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING`, `transactionReadOnly` diverso da `on` o `writesPerformed` diverso da `false` è uno STOP senza retry. Non inviare URL database, key o token.

**Checkpoint qualificazione e autorizzazione 2026-09-09 — PASS / CANARY AUTHORIZED.** Il report eseguito nel Codespace ha restituito `PASS_READ_ONLY_TECHNICAL_QUALIFICATION_DISPOSABLE_ATTESTATION_PENDING`, `transactionReadOnly=on`, `writesPerformed=false` e `QUALIFICATION_EXIT_CODE=0`. L'utente ha inoltre attestato che l'account è fittizio, dedicato ai test ed eliminabile con i suoi dati. Sono autorizzati esclusivamente su `b5ba567a-194b-4e07-afe7-f8f9ce29a808`: un PATCH Profile, una sostituzione atomica delle esperienze, le letture di verifica e il teardown ordinario. Qualificazione, build, deploy e migration non devono essere ripetuti.

**Metodo effettivo esperienze — PATCH, non PUT.** Nel commit Production distribuito `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`, `app/api/profiles/me/experiences/route.ts` esporta `GET` e `PATCH`; non esporta `PUT`. Il `PATCH` legge `{ experiences: [...] }`, costruisce l'intera lista e la passa una sola volta alla RPC `replace_my_athlete_experiences(jsonb)`, quindi la semantica è replacement atomico anche se il verbo HTTP è PATCH. Anche `ProfileEditForm` usa `method: 'PATCH'`. Ogni riferimento precedente a PUT era documentazione errata ed è corretto; inviare PUT produrrebbe `405 Method Not Allowed` e non deve essere provato.

## Esecuzione guidata — Step 1 soltanto

Usare la baseline già raccolta: non rieseguire il report di qualificazione. Prima di qualsiasi richiesta HTTP, caricare la sessione del solo account canary come secret nel terminale Codespace e preparare le costanti, senza stampare il token:

```bash
set +o history
set -euo pipefail
export CANARY_USER_ID='b5ba567a-194b-4e07-afe7-f8f9ce29a808'
export RELEASE_COMMIT='36dfa9860d9d12f5373ea3a85d76f706b4d718a4'
export PROD_BASE_URL='https://www.clubandplayer.com'
read -rsp 'CANARY_TOKEN: ' CANARY_TOKEN; printf '\n'
export CANARY_TOKEN
test -n "$CANARY_TOKEN"
printf 'PHASE_5F_CANARY_SECRET_READY user=%s release=%s\n' "$CANARY_USER_ID" "$RELEASE_COMMIT"
```

Non usare `set -x`, non incollare il token in chat e non eseguire ancora `curl`. Il solo output da comunicare è `PHASE_5F_CANARY_SECRET_READY ...`; lo Step 2 acquisirà le due baseline HTTP autenticate senza ripetere la qualificazione SQL e prima della prima scrittura.

**Checkpoint Step 1 2026-09-09 — PASS USER-REPORTED.** Il marker ricevuto associa il secret caricato localmente all'owner e alla release attesi. Il token non è stato condiviso. Nessuna richiesta è stata ancora inviata.

## Esecuzione guidata — Step 2 soltanto

Questo step esegue esclusivamente i due `GET` autenticati Profile ed esperienze e conserva i body completi in file `/tmp` mode owner-only; non invia PATCH e non stampa né token né dati Profile. La qualificazione SQL già conclusa garantisce la riga Profile Staff esistente, quindi il percorso di integrità del GET Profile non deve creare o correggere righe. Qualunque status o shape inatteso è uno STOP con i file conservati.

Eseguire nello **stesso terminale** dello Step 1, senza `set -u`:

```bash
set +u
set -eo pipefail
umask 077

: "${CANARY_TOKEN:?CANARY_TOKEN non presente in questo terminale}"
: "${CANARY_USER_ID:?CANARY_USER_ID non presente in questo terminale}"
: "${PROD_BASE_URL:?PROD_BASE_URL non presente in questo terminale}"

PROFILE_BEFORE='/tmp/phase-5f-canary-profile-before.json'
EXPERIENCES_BEFORE='/tmp/phase-5f-canary-experiences-before.json'

PROFILE_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$PROFILE_BEFORE" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me")"

EXPERIENCES_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$EXPERIENCES_BEFORE" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me/experiences")"

if [ "$PROFILE_STATUS" != '200' ] || [ "$EXPERIENCES_STATUS" != '200' ]; then
  printf 'PHASE_5F_CANARY_STOP baseline_http profile=%s experiences=%s\n' \
    "$PROFILE_STATUS" "$EXPERIENCES_STATUS"
  false
fi

if ! jq -e --arg user "$CANARY_USER_ID" '
    .data != null
    and .data.user_id == $user
    and ((.data.account_type // .data.type // "") | ascii_downcase) == "staff"
    and .data.is_admin != true
    and .data.sport_id == null
    and .data.sport_discipline_id == null
    and .data.sport_variant_id == null
  ' "$PROFILE_BEFORE" >/dev/null \
  || ! jq -e '
    (.data | type) == "array"
    and all(.data[]; .primarySport == null)
  ' "$EXPERIENCES_BEFORE" >/dev/null; then
  printf 'PHASE_5F_CANARY_STOP baseline_shape\n'
  false
fi

PROFILE_SHA256="$(sha256sum "$PROFILE_BEFORE" | cut -d' ' -f1)"
EXPERIENCES_SHA256="$(sha256sum "$EXPERIENCES_BEFORE" | cut -d' ' -f1)"
EXPERIENCE_COUNT="$(jq '.data | length' "$EXPERIENCES_BEFORE")"

printf 'PHASE_5F_CANARY_BASELINE_HTTP_PASS profile=%s experiences=%s count=%s profile_sha256=%s experiences_sha256=%s\n' \
  "$PROFILE_STATUS" "$EXPERIENCES_STATUS" "$EXPERIENCE_COUNT" \
  "$PROFILE_SHA256" "$EXPERIENCES_SHA256"
```

Se un `jq` fallisce, il blocco stampa `PHASE_5F_CANARY_STOP baseline_shape`, conserva entrambi i file e si ferma senza PATCH o teardown. Se passa, comunicare soltanto la riga `PHASE_5F_CANARY_BASELINE_HTTP_PASS`; non incollare i JSON o il token. Lo Step 3 preparerà e mostrerà il payload Profile esatto prima della prima scrittura autorizzata.

**Checkpoint Step 2 2026-09-09 — PASS USER-REPORTED.** Entrambi i GET hanno restituito 200, la baseline esperienze contiene una riga e i file privati hanno SHA-256 Profile `7646c11e47c833ca306a125ad399733d0bb15ee884a5d015472bed91415850f5` ed esperienze `5f804c35bbaa20fbb75d111c4b6936820e95c6c813fb7544bd5bd2400b7c29e9`. I file e il token restano nello stesso terminale. Nessuna scrittura è stata eseguita.

## Esecuzione guidata — Step 3 Profile completo

Questo blocco verifica gli hash della baseline già acquisita, deriva `{ "sport": <baseline> }` senza mostrarlo, invia **esattamente un PATCH Profile**, quindi acquisisce un GET Profile e un GET esperienze. Accetta soltanto legacy sport invariato, `sport_id` UUID non null, catena discipline/variant strutturalmente coerente, `updated_at` modificato, ogni altro campo Profile invariato ed esperienze byte-identiche alla baseline. Non contiene retry, PATCH esperienze o teardown.

Eseguire nello stesso terminale, senza `set -u`:

```bash
set +u
set -eo pipefail
umask 077

: "${CANARY_TOKEN:?CANARY_TOKEN non presente in questo terminale}"
: "${CANARY_USER_ID:?CANARY_USER_ID non presente in questo terminale}"
: "${PROD_BASE_URL:?PROD_BASE_URL non presente in questo terminale}"

PROFILE_BEFORE="${PROFILE_BEFORE:-/tmp/phase-5f-canary-profile-before.json}"
EXPERIENCES_BEFORE="${EXPERIENCES_BEFORE:-/tmp/phase-5f-canary-experiences-before.json}"
PROFILE_PATCH_PAYLOAD='/tmp/phase-5f-canary-profile-patch-payload.json'
PROFILE_PATCH_RESPONSE='/tmp/phase-5f-canary-profile-patch-response.json'
PROFILE_AFTER='/tmp/phase-5f-canary-profile-after.json'
EXPERIENCES_AFTER='/tmp/phase-5f-canary-experiences-after-profile.json'

EXPECTED_PROFILE_BEFORE_SHA256='7646c11e47c833ca306a125ad399733d0bb15ee884a5d015472bed91415850f5'
EXPECTED_EXPERIENCES_BEFORE_SHA256='5f804c35bbaa20fbb75d111c4b6936820e95c6c813fb7544bd5bd2400b7c29e9'

if [ "$(sha256sum "$PROFILE_BEFORE" | cut -d' ' -f1)" != "$EXPECTED_PROFILE_BEFORE_SHA256" ] \
  || [ "$(sha256sum "$EXPERIENCES_BEFORE" | cut -d' ' -f1)" != "$EXPECTED_EXPERIENCES_BEFORE_SHA256" ]; then
  printf 'PHASE_5F_CANARY_STOP baseline_hash_drift\n'
  false
fi

if ! jq -ce '
    .data.sport as $sport
    | select(($sport | type) == "string" and ($sport | length) > 0)
    | {sport: $sport}
  ' "$PROFILE_BEFORE" >"$PROFILE_PATCH_PAYLOAD"; then
  printf 'PHASE_5F_CANARY_STOP profile_payload\n'
  false
fi

PATCH_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --request PATCH --output "$PROFILE_PATCH_RESPONSE" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary "@$PROFILE_PATCH_PAYLOAD" \
  "$PROD_BASE_URL/api/profiles/me")"

if [ "$PATCH_STATUS" != '200' ]; then
  printf 'PHASE_5F_CANARY_STOP profile_patch_http=%s\n' "$PATCH_STATUS"
  false
fi

PROFILE_AFTER_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$PROFILE_AFTER" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me")"

EXPERIENCES_AFTER_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$EXPERIENCES_AFTER" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me/experiences")"

if [ "$PROFILE_AFTER_STATUS" != '200' ] || [ "$EXPERIENCES_AFTER_STATUS" != '200' ]; then
  printf 'PHASE_5F_CANARY_STOP profile_verify_http profile=%s experiences=%s\n' \
    "$PROFILE_AFTER_STATUS" "$EXPERIENCES_AFTER_STATUS"
  false
fi

jq -S '.data | del(.updated_at, .sport_id, .sport_discipline_id, .sport_variant_id)' \
  "$PROFILE_BEFORE" > /tmp/phase-5f-canary-profile-before-stable.json
jq -S '.data | del(.updated_at, .sport_id, .sport_discipline_id, .sport_variant_id)' \
  "$PROFILE_AFTER" > /tmp/phase-5f-canary-profile-after-stable.json

if ! jq -e --arg user "$CANARY_USER_ID" --slurpfile before "$PROFILE_BEFORE" '
    .data.user_id == $user
    and .data.sport == $before[0].data.sport
    and (.data.sport_id | type) == "string"
    and (.data.sport_id | test("^[0-9a-fA-F-]{36}$"))
    and (.data.sport_discipline_id == null or ((.data.sport_discipline_id | type) == "string" and (.data.sport_discipline_id | test("^[0-9a-fA-F-]{36}$"))))
    and (.data.sport_variant_id == null or (.data.sport_discipline_id != null and (.data.sport_variant_id | type) == "string" and (.data.sport_variant_id | test("^[0-9a-fA-F-]{36}$"))))
    and (.data.updated_at | type) == "string"
    and .data.updated_at != $before[0].data.updated_at
  ' "$PROFILE_PATCH_RESPONSE" >/dev/null \
  || ! jq -e --slurpfile patch "$PROFILE_PATCH_RESPONSE" '
    .data.user_id == $patch[0].data.user_id
    and .data.sport == $patch[0].data.sport
    and .data.sport_id == $patch[0].data.sport_id
    and .data.sport_discipline_id == $patch[0].data.sport_discipline_id
    and .data.sport_variant_id == $patch[0].data.sport_variant_id
  ' "$PROFILE_AFTER" >/dev/null \
  || ! cmp -s /tmp/phase-5f-canary-profile-before-stable.json /tmp/phase-5f-canary-profile-after-stable.json \
  || [ "$(sha256sum "$EXPERIENCES_AFTER" | cut -d' ' -f1)" != "$EXPECTED_EXPERIENCES_BEFORE_SHA256" ]; then
  printf 'PHASE_5F_CANARY_STOP profile_comparison\n'
  false
fi

PROFILE_AFTER_SHA256="$(sha256sum "$PROFILE_AFTER" | cut -d' ' -f1)"
CANONICAL_CONTEXT_SHA256="$(jq -c '.data | {sport,sport_id,sport_discipline_id,sport_variant_id}' \
  "$PROFILE_AFTER" | sha256sum | cut -d' ' -f1)"

printf 'PHASE_5F_CANARY_PROFILE_PASS patch=%s profile_get=%s experiences_get=%s profile_after_sha256=%s canonical_context_sha256=%s\n' \
  "$PATCH_STATUS" "$PROFILE_AFTER_STATUS" "$EXPERIENCES_AFTER_STATUS" \
  "$PROFILE_AFTER_SHA256" "$CANONICAL_CONTEXT_SHA256"
```

Se compare `PHASE_5F_CANARY_STOP`, non rilanciare alcuna richiesta: conservare tutti i file `/tmp` e fermarsi senza PATCH esperienze o teardown. Se passa, comunicare soltanto `PHASE_5F_CANARY_PROFILE_PASS ...`; non incollare payload, JSON, sport o token. Lo Step 4 userà la baseline esperienze già conservata per l'unica sostituzione atomica autorizzata.

**Checkpoint Step 3 2026-09-09 — PROFILE PASS USER-REPORTED.** L'unico PATCH Profile e i due GET di confronto hanno restituito 200. Il Profile post-write ha SHA-256 `c98e964fdb6dfde8b1db811ad4de2be229d53747394193401a2815be55a2d4f1` e il gruppo sportivo canonico SHA-256 `7d78ae8e3f697e6bd3c10edef77eb21eca8ad5e2b89585739fdaa0adcfadf97d`; i confronti del blocco hanno confermato owner, dual-write, timestamp, altri campi invariati ed esperienze ancora identiche alla baseline. Nessun retry, PATCH esperienze o teardown è stato eseguito.

## Esecuzione guidata — Step 4 esperienze completo

Questo blocco ricontrolla la baseline esperienze originale e il Profile risultante dallo Step 3, deriva un payload di replacement eliminando esclusivamente il `primarySport: null` additivo dalla riga legacy, esegue **esattamente un PATCH** su `/api/profiles/me/experiences`, quindi acquisisce un GET esperienze e un GET Profile. Accetta soltanto stessa lista legacy, stesso conteggio, contesto sportivo canonico coerente su ogni esperienza, risposta PATCH uguale al read-after-write e Profile byte-identico allo Step 3. Non contiene retry o teardown.

Eseguire nello stesso terminale, senza `set -u`:

```bash
set +u
set -eo pipefail
umask 077

: "${CANARY_TOKEN:?CANARY_TOKEN non presente in questo terminale}"
: "${CANARY_USER_ID:?CANARY_USER_ID non presente in questo terminale}"
: "${PROD_BASE_URL:?PROD_BASE_URL non presente in questo terminale}"

EXPERIENCES_BEFORE="${EXPERIENCES_BEFORE:-/tmp/phase-5f-canary-experiences-before.json}"
PROFILE_AFTER="${PROFILE_AFTER:-/tmp/phase-5f-canary-profile-after.json}"
EXPERIENCES_PATCH_PAYLOAD='/tmp/phase-5f-canary-experiences-patch-payload.json'
EXPERIENCES_PATCH_RESPONSE='/tmp/phase-5f-canary-experiences-patch-response.json'
EXPERIENCES_CANONICAL='/tmp/phase-5f-canary-experiences-canonical.json'
PROFILE_AFTER_EXPERIENCES='/tmp/phase-5f-canary-profile-after-experiences.json'

EXPECTED_EXPERIENCES_BEFORE_SHA256='5f804c35bbaa20fbb75d111c4b6936820e95c6c813fb7544bd5bd2400b7c29e9'
EXPECTED_PROFILE_AFTER_SHA256='c98e964fdb6dfde8b1db811ad4de2be229d53747394193401a2815be55a2d4f1'

if [ "$(sha256sum "$EXPERIENCES_BEFORE" | cut -d' ' -f1)" != "$EXPECTED_EXPERIENCES_BEFORE_SHA256" ] \
  || [ "$(sha256sum "$PROFILE_AFTER" | cut -d' ' -f1)" != "$EXPECTED_PROFILE_AFTER_SHA256" ]; then
  printf 'PHASE_5F_CANARY_STOP step4_input_hash_drift\n'
  false
fi

if ! jq -ce '
    select((.data | type) == "array" and (.data | length) == 1)
    | {experiences: [.data[] | del(.primarySport)]}
    | select(all(.experiences[];
        (.club | type) == "string" and (.club | length) > 0
        and (.sport | type) == "string" and (.sport | length) > 0
        and (.role | type) == "string" and (.role | length) > 0
        and (.category | type) == "string" and (.category | length) > 0
        and (.season | type) == "string" and (.season | length) > 0
      ))
  ' "$EXPERIENCES_BEFORE" >"$EXPERIENCES_PATCH_PAYLOAD"; then
  printf 'PHASE_5F_CANARY_STOP experiences_payload\n'
  false
fi

EXPERIENCES_PATCH_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --request PATCH --output "$EXPERIENCES_PATCH_RESPONSE" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary "@$EXPERIENCES_PATCH_PAYLOAD" \
  "$PROD_BASE_URL/api/profiles/me/experiences")"

if [ "$EXPERIENCES_PATCH_STATUS" != '200' ]; then
  printf 'PHASE_5F_CANARY_STOP experiences_patch_http=%s\n' "$EXPERIENCES_PATCH_STATUS"
  false
fi

EXPERIENCES_GET_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$EXPERIENCES_CANONICAL" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me/experiences")"

PROFILE_GET_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --output "$PROFILE_AFTER_EXPERIENCES" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/profiles/me")"

if [ "$EXPERIENCES_GET_STATUS" != '200' ] || [ "$PROFILE_GET_STATUS" != '200' ]; then
  printf 'PHASE_5F_CANARY_STOP experiences_verify_http experiences=%s profile=%s\n' \
    "$EXPERIENCES_GET_STATUS" "$PROFILE_GET_STATUS"
  false
fi

jq -S . "$EXPERIENCES_PATCH_RESPONSE" > /tmp/phase-5f-canary-experiences-patch-sorted.json
jq -S . "$EXPERIENCES_CANONICAL" > /tmp/phase-5f-canary-experiences-get-sorted.json

if ! jq -e --slurpfile before "$EXPERIENCES_BEFORE" '
    (.data | type) == "array"
    and (.data | length) == ($before[0].data | length)
    and ([.data[] | del(.primarySport)] == [$before[0].data[] | del(.primarySport)])
    and all(.data[];
      (.primarySport | type) == "object"
      and (.primarySport.sportId | type) == "string"
      and (.primarySport.sportId | test("^[0-9a-fA-F-]{36}$"))
      and (.primarySport.disciplineId == null or ((.primarySport.disciplineId | type) == "string" and (.primarySport.disciplineId | test("^[0-9a-fA-F-]{36}$"))))
      and (.primarySport.variantId == null or (.primarySport.disciplineId != null and (.primarySport.variantId | type) == "string" and (.primarySport.variantId | test("^[0-9a-fA-F-]{36}$"))))
    )
  ' "$EXPERIENCES_PATCH_RESPONSE" >/dev/null \
  || ! cmp -s /tmp/phase-5f-canary-experiences-patch-sorted.json /tmp/phase-5f-canary-experiences-get-sorted.json \
  || [ "$(sha256sum "$PROFILE_AFTER_EXPERIENCES" | cut -d' ' -f1)" != "$EXPECTED_PROFILE_AFTER_SHA256" ]; then
  printf 'PHASE_5F_CANARY_STOP experiences_comparison\n'
  false
fi

EXPERIENCES_AFTER_SHA256="$(sha256sum "$EXPERIENCES_CANONICAL" | cut -d' ' -f1)"
EXPERIENCES_CONTEXT_SHA256="$(jq -c '[.data[].primarySport]' "$EXPERIENCES_CANONICAL" \
  | sha256sum | cut -d' ' -f1)"
EXPERIENCE_COUNT="$(jq '.data | length' "$EXPERIENCES_CANONICAL")"

printf 'PHASE_5F_CANARY_EXPERIENCES_PASS patch=%s experiences_get=%s profile_get=%s count=%s experiences_sha256=%s contexts_sha256=%s\n' \
  "$EXPERIENCES_PATCH_STATUS" "$EXPERIENCES_GET_STATUS" "$PROFILE_GET_STATUS" \
  "$EXPERIENCE_COUNT" "$EXPERIENCES_AFTER_SHA256" "$EXPERIENCES_CONTEXT_SHA256"
```

Se compare `PHASE_5F_CANARY_STOP`, non rilanciare: conservare tutti i file e fermarsi prima del teardown. Se passa, comunicare soltanto `PHASE_5F_CANARY_EXPERIENCES_PASS ...`; non incollare payload, JSON, sport, club o token. Lo Step 5 svolgerà le verifiche finali read-only su owner/side effect prima del teardown già autorizzato.

**Checkpoint Step 4 2026-09-09 — EXPERIENCES PASS USER-REPORTED.** L'unico PATCH esperienze e i GET esperienze/Profile hanno restituito 200, con una esperienza. Il GET esperienze post-write ha SHA-256 `0364b47208d3b9ad9bb85869a24d889be8a58e1de38adc0a99090f03fc6ca372` e l'array dei contesti canonici SHA-256 `cc039a4f595fbba7f76280e1e1929790946dce5baffe014843c0386a3580c2a5`. I confronti del blocco hanno confermato replacement/read-after-write identici, valori legacy e cardinalità preservati, contesto canonico coerente e Profile invariato. Nessun retry o teardown è stato eseguito.

## Esecuzione guidata — Step 5 consolidamento evidenze read-only

Questo controllo opera soltanto sui file privati già raccolti: non invia richieste HTTP e non interroga il database. Consolida le prove già prodotte dagli Step 3–4 verificando owner del Profile, hash Profile invariato dopo il PATCH esperienze, hash del GET esperienze e dei contesti canonici, cardinalità e uguaglianza dei campi legacy con la baseline. Non sostituisce né ripete la qualificazione tecnica già conclusa.

```bash
set +u
set -eo pipefail
umask 077

: "${CANARY_USER_ID:?CANARY_USER_ID non presente in questo terminale}"

PROFILE_AFTER='/tmp/phase-5f-canary-profile-after.json'
PROFILE_AFTER_EXPERIENCES='/tmp/phase-5f-canary-profile-after-experiences.json'
EXPERIENCES_BEFORE='/tmp/phase-5f-canary-experiences-before.json'
EXPERIENCES_CANONICAL='/tmp/phase-5f-canary-experiences-canonical.json'

EXPECTED_PROFILE_SHA256='c98e964fdb6dfde8b1db811ad4de2be229d53747394193401a2815be55a2d4f1'
EXPECTED_EXPERIENCES_SHA256='0364b47208d3b9ad9bb85869a24d889be8a58e1de38adc0a99090f03fc6ca372'
EXPECTED_CONTEXTS_SHA256='cc039a4f595fbba7f76280e1e1929790946dce5baffe014843c0386a3580c2a5'

if [ "$(sha256sum "$PROFILE_AFTER" | cut -d' ' -f1)" != "$EXPECTED_PROFILE_SHA256" ] \
  || [ "$(sha256sum "$PROFILE_AFTER_EXPERIENCES" | cut -d' ' -f1)" != "$EXPECTED_PROFILE_SHA256" ] \
  || [ "$(sha256sum "$EXPERIENCES_CANONICAL" | cut -d' ' -f1)" != "$EXPECTED_EXPERIENCES_SHA256" ] \
  || [ "$(jq -c '[.data[].primarySport]' "$EXPERIENCES_CANONICAL" | sha256sum | cut -d' ' -f1)" != "$EXPECTED_CONTEXTS_SHA256" ]; then
  printf 'PHASE_5F_CANARY_STOP evidence_hash_drift\n'
  false
fi

if ! jq -e --arg user "$CANARY_USER_ID" '.data.user_id == $user' "$PROFILE_AFTER_EXPERIENCES" >/dev/null \
  || ! jq -e --slurpfile before "$EXPERIENCES_BEFORE" '
    (.data | length) == 1
    and ([.data[] | del(.primarySport)] == [$before[0].data[] | del(.primarySport)])
    and all(.data[]; (.primarySport | type) == "object" and (.primarySport.sportId | type) == "string")
  ' "$EXPERIENCES_CANONICAL" >/dev/null; then
  printf 'PHASE_5F_CANARY_STOP evidence_owner_or_side_effect\n'
  false
fi

printf 'PHASE_5F_CANARY_FINAL_READ_ONLY_PASS owner=%s profile_sha256=%s experiences_sha256=%s contexts_sha256=%s\n' \
  "$CANARY_USER_ID" "$EXPECTED_PROFILE_SHA256" "$EXPECTED_EXPERIENCES_SHA256" "$EXPECTED_CONTEXTS_SHA256"
```

Un `STOP` conserva lo stato e impedisce il teardown. Dopo il PASS, il solo passaggio ancora aperto del canary è il teardown ordinario già autorizzato e la verifica della rimozione; non effettuare il teardown nello stesso comando.

**Checkpoint Step 5 2026-09-09 — FINAL READ-ONLY PASS USER-REPORTED.** Il consolidamento locale ha riconfermato owner `b5ba567a-194b-4e07-afe7-f8f9ce29a808`, Profile SHA-256 `c98e964fdb6dfde8b1db811ad4de2be229d53747394193401a2815be55a2d4f1`, esperienze SHA-256 `0364b47208d3b9ad9bb85869a24d889be8a58e1de38adc0a99090f03fc6ca372` e contesti SHA-256 `cc039a4f595fbba7f76280e1e1929790946dce5baffe014843c0386a3580c2a5`. Non sono state inviate nuove request e non è stato eseguito il teardown.

## Esecuzione guidata — Step 6 teardown ordinario

La procedura ordinaria dell'app è `DELETE /api/account/delete`, autenticata come l'owner disposable. La route elimina i dati Profile/push-token dell'utente e poi l'utente Auth tramite il client amministrativo; non accetta un UUID nel payload, quindi il target deriva esclusivamente dalla sessione canary. Questo step esegue **una sola DELETE**, salva privatamente la risposta e non contiene retry né verifica successiva.

```bash
set +u
set -eo pipefail
umask 077

: "${CANARY_TOKEN:?CANARY_TOKEN non presente in questo terminale}"
: "${CANARY_USER_ID:?CANARY_USER_ID non presente in questo terminale}"
: "${PROD_BASE_URL:?PROD_BASE_URL non presente in questo terminale}"

EXPECTED_CANARY_USER_ID='b5ba567a-194b-4e07-afe7-f8f9ce29a808'
TEARDOWN_RESPONSE='/tmp/phase-5f-canary-teardown-response.json'

if [ "$CANARY_USER_ID" != "$EXPECTED_CANARY_USER_ID" ]; then
  printf 'PHASE_5F_CANARY_STOP teardown_owner_mismatch\n'
  false
fi

TEARDOWN_STATUS="$(curl --silent --show-error --proto '=https' --tlsv1.2 \
  --request DELETE --output "$TEARDOWN_RESPONSE" --write-out '%{http_code}' \
  -H "Authorization: Bearer $CANARY_TOKEN" \
  "$PROD_BASE_URL/api/account/delete")"

if [ "$TEARDOWN_STATUS" != '200' ] || ! jq -e '.ok == true' "$TEARDOWN_RESPONSE" >/dev/null; then
  printf 'PHASE_5F_CANARY_STOP teardown_http=%s\n' "$TEARDOWN_STATUS"
  false
fi

printf 'PHASE_5F_CANARY_TEARDOWN_REQUEST_PASS status=%s owner=%s\n' \
  "$TEARDOWN_STATUS" "$CANARY_USER_ID"
```

In caso di `STOP`, non ripetere la DELETE: conservare la risposta e fermarsi. In caso di PASS, non considerare ancora concluso il teardown finché una verifica separata non conferma l'assenza dell'utente Auth, del Profile e delle esperienze; non incollare il body della risposta o il token.

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
7. autorizzazioni esplicite per il PATCH Profile, il PATCH esperienze e il teardown — **PASS**.

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

Il deploy, la qualificazione tecnica, l'attestazione disposable e gli Step 1–5 sono **PASS**; il canary è **AUTHORIZED / TEARDOWN REQUEST PENDING**. Il prossimo e unico passaggio è lo Step 6 sopra. Una divergenza impone STOP, conservazione delle evidenze e nessun retry automatico.
