# FASE 5F-G — Preflight promozione runtime Production

Data: 2026-09-09  
Stato: **PASS — CANDIDATO PRONTO PER LA PROMOZIONE MANUALE GIÀ AUTORIZZATA**

## Evidenza Preview acquisita

L'utente ha verificato in Vercel il deployment Preview del candidato immutabile `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`: stato `Ready` e build `pnpm run build` → `next build --turbopack` completata. Questa build non è stata ripetuta. La promozione, le migration e il canary non sono stati eseguiti in questo checkpoint.

## Valutazione dei warning

### `Ignored build scripts: esbuild`

`esbuild` è presente soltanto come dipendenza transitiva di sviluppo di `tsx`, usato dai comandi di test e dagli script TypeScript. Non è una dipendenza applicativa diretta e nessun file sotto `app/`, `components/` o `lib/` lo importa. La build Production usa direttamente `next build --turbopack` ed è terminata con stato `Ready`, quindi Turbopack/Next ha già prodotto gli artefatti senza richiedere il postinstall di `esbuild`.

Esito: **warning non bloccante per questo candidato**. Non aggiungere `esbuild` a `pnpm.onlyBuiltDependencies` e non cambiare dipendenze soltanto per silenziarlo. Diventerebbe bloccante soltanto se un comando che usa `tsx`/`esbuild` dovesse essere eseguito nella funzione Production o se la build fallisse per il relativo binario; nessuna delle due condizioni è presente.

### Runtime non riconosciuto in `/api/applications/mine/route`

`app/api/applications/mine/route.ts` riesporta `runtime` e `GET` da `../me/route`; l'analizzatore statico Next non ricava il valore di route-segment config attraverso questa riesportazione e usa quindi la configurazione predefinita. Il target intenzionale nella route sorgente è la stringa statica `nodejs`. Il default di una App Route non marcata `edge` è ancora il runtime Node.js: il warning non sposta quindi la route su Edge e il medesimo handler `GET` continua a essere riesportato.

La route alias e la route sorgente sono identiche negli SHA Production `772a45bb6b279409da48ffb08ad39510bf359651` e candidato `36dfa9860d9d12f5373ea3a85d76f706b4d718a4`; il warning non è introdotto dal delta 5F. Il handler usa `withAuth`, Supabase e `NextResponse`, tutti già eseguiti sul percorso Node previsto. La build completa conferma inoltre che non è un errore di compilazione.

Esito: **warning noto e non bloccante per la promozione 5F**. Non modificare la route soltanto per silenziarlo; un'eventuale eliminazione del warning è manutenzione separata, perché cambierebbe un file estraneo al candidato verificato.

## Delta applicativo Production → candidato

Il confronto `772a45bb6b279409da48ffb08ad39510bf359651..36dfa9860d9d12f5373ea3a85d76f706b4d718a4` contiene questi gruppi applicativi:

1. **Remediation di presentazione/i18n 5C:** localizzazione dei valori controllati e dei fallback su Profile, Club, Institution, Discover, Following, feed e Opportunities; il valore persistito non cambia.
2. **Foundation canonica 5D–5E:** manifest/source-readiness repository-only e adapter/service/repository server per Sport → Discipline → Variant. I moduli runtime interrogano soltanto `sports`, `sport_disciplines`, `sport_variants` e `legacy_sport_mappings`.
3. **Profile 5F:** `PATCH /api/profiles/me` pianifica il gruppo sportivo soltanto quando `sport` o `primarySport` è presente, quindi applica legacy e tre ID canonici nella stessa mutation owner-scoped e restituisce errori stabili/opachi.
4. **Esperienze 5F:** `GET /api/profiles/me/experiences` aggiunge `primarySport`; `PUT` usa lo stesso planner, conserva i campi legacy e sostituisce atomicamente la lista tramite `replace_my_athlete_experiences(jsonb)`.

Non risultano modifiche nel delta a `package.json`, `pnpm-lock.yaml`, `vercel.json`, `next.config.ts`, `app/api/applications/mine/route.ts` o `app/api/applications/me/route.ts`.

## Dipendenze database e assenza di apply automatico

Il runtime candidato richiede soltanto oggetti già certificati in Production:

- foundation Sport/Discipline/Variant e `legacy_sport_mappings` della Fase 1;
- candidate key/cataloghi 5C;
- colonne/vincoli Profile 5F-A, applicati e registrati con history count 1;
- colonne/vincoli/RPC esperienze 5F, applicati e registrati con history count 1.

La migration pendente `20261207120000_seed_controlled_sports_vocabulary.sql` inserisce `competition_formats`, `player_positions`, `staff_roles` e mapping/applicabilità di position/role. Le route 5F non interrogano questi oggetti e continuano a mantenere `role` e `category` legacy; **5D-C non è prerequisito del deploy 5F**. Nessun seed o backfill è richiesto.

La pipeline Vercel è non mutativa rispetto al database: `vercel.json` esegue `pnpm install --frozen-lockfile` e `pnpm run build`; lo script `build` esegue soltanto `next build --turbopack`. Non esistono hook `vercel-build`, `prebuild`, `postbuild`, `supabase db push`, `migration repair` o comandi equivalenti. Gli harness che applicano SQL puntano a database locali temporanei e non sono richiamati da install/build/deploy.

## Decisione

**PASS: il candidato `36dfa9860d9d12f5373ea3a85d76f706b4d718a4` è pronto per la promozione manuale Vercel Production già autorizzata.** I due warning non alterano il runtime richiesto e non giustificano modifiche a route, dipendenze o configurazione. Non esistono blocker pre-deploy identificati.

La promozione deve usare esclusivamente lo SHA verificato sul progetto che serve `https://www.clubandplayer.com`, mantenendo Supabase Production `izzfjrcabtixxsrnkzro`. Non eseguire migration, seed, merge o canary. Dopo la promozione fermarsi al post-check read-only di URL, ambiente, SHA e project ref; il canary richiederà autorizzazione separata.
