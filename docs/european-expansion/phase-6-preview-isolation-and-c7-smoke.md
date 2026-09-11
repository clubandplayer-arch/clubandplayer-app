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
