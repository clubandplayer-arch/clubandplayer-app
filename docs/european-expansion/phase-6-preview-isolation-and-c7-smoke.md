# FASE 6 — Verifica isolamento Preview e smoke Calcio a 7

Data: 2026-09-11  
Target dichiarato: Supabase `fase6-github` (`jbovlevodfouwuvtdlja`) e Vercel Preview del branch `codex/implementare-categorie-sportive-per-paesi`.  
Stato: **ISOLAMENTO RUNTIME BLOCCATO DA VERCEL SSO; SMOKE MUTATIVI NON ESEGUITI**.

## Evidenze ricevute

L'operatore dichiara Supabase Preview Healthy, ultima migration `add_seven_a_side_football_variant`, cinque variabili Vercel Preview allineate al project ref Preview e GitHub `Deploy to production` disabilitato. Queste sono evidenze user-reported, non una certificazione runtime dell'agente. La migration C7 è già applicata e non deve essere ripetuta.

## Verifiche effettive

Richieste HTTP senza credenziali a `/`, `/api/env`, `/api/sports/catalog` e `/api/auth/whoami` hanno tutte ricevuto `302` verso `vercel.com/sso-api`. È quindi confermata la Deployment Protection, ma non sono osservabili commit, `VERCEL_ENV`, project ref browser/server o catalogo. Il project Supabase Preview risponde sul proprio host, ma senza `apikey` restituisce correttamente `401`; nessuna chiave è presente nell'ambiente agente.

L'audit repository non trova URL Supabase hardcoded nei client interessati: browser usa `NEXT_PUBLIC_SUPABASE_URL`; server preferisce `SUPABASE_URL` e può ripiegare sulla variabile pubblica. È stato reso più sicuro `/api/env`: ora restituisce soltanto project ref pubblico/server, origine dell'URL server, uguaglianza delle anon key, presenza booleana della service-role, SHA e modalità. Non restituisce URL completi, chiavi o token.

## Gate non superati

| Gate | Esito |
|---|---|
| deployment effettivo e SHA | BLOCKED — Vercel SSO |
| build successiva alle cinque variabili | BLOCKED — Vercel SSO/dashboard non disponibile |
| browser ref = server ref = `jbovlevodfouwuvtdlja` | BLOCKED — `/api/env` protetto |
| credenziali anon coerenti | BLOCKED — `/api/env` protetto |
| service-role valida per il project Preview | BLOCKED — nessun probe autenticato e nessun secret locale |
| `seven_a_side` e mapping remoto | USER-REPORTED migration presente; runtime non verificato |
| Apple Auth Preview | config repository corretta; runtime non verificato |
| smoke C7 read/save/reload | NOT EXECUTED — isolamento non certificato |
| regressione selector esistenti | test repository PASS; browser Preview non eseguito |

## Solo intervento manuale indispensabile

Generare dalla dashboard Vercel un **Protection Bypass for Automation** limitato a questo deployment/Preview e fornirlo all'ambiente di verifica tramite canale secret come `VERCEL_AUTOMATION_BYPASS_SECRET`, oppure disabilitare temporaneamente la Deployment Protection esclusivamente per questo Preview. Non incollare il valore in chat.

Dopo lo sblocco, ripetere prima i GET. Gli smoke con salvataggio possono iniziare soltanto se `/api/env` mostra `mode=preview`, lo SHA atteso, entrambi i project ref uguali a `jbovlevodfouwuvtdlja`, `serverUrlSource=SUPABASE_URL`, `projectRefsMatch=true`, `anonKeysMatch=true` e `serviceRoleConfigured=true`. Servirà poi un account di test Player/Club disponibile sulla sola Preview; non crearne uno Production.

## Confini

Nessun salvataggio, account, migration, query mutativa, reset o teardown remoto è stato eseguito. Nessun accesso a Production. L'intera FASE 6 non è conclusa.
