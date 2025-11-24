# Rollout flag admin per /clubs

Questa guida descrive come abilitare o disattivare i controlli CRUD della pagina `/clubs`
utilizzando i flag `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` (client) e `CLUBS_ADMIN_EMAILS`
(server). Segui tutti i passaggi ogni volta che intendi consentire modifiche
dall'ambiente Preview/Production.

## 1. Prerequisiti
- **Account primario monitorato**: scegli un indirizzo email che verrà usato per i test e
  per il monitoraggio in produzione. Deve essere presente sia in `ADMIN_EMAILS` sia in
  `CLUBS_ADMIN_EMAILS`. Mantieni la sessione attiva e conferma che `/api/auth/whoami`
  restituisca `clubsAdmin: true`.
- **Allowlist non vuota**: `CLUBS_ADMIN_EMAILS` deve contenere tutti gli admin autorizzati.
  Replica la lista (solo se utile alla diagnostica UI) in `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS`.
- **Flag read-only**: mantieni `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` sugli ambienti in cui
  non vuoi permettere modifiche (es. produzione in modalità freeze).
- **Smoke test**: prima del rollout esegui i test manuali descritti in
  [`docs/smoke-tests/clubs.md`](../smoke-tests/clubs.md) per assicurarti che CRUD e RLS
  funzionino ancora.

> Usa `node scripts/check-clubs-flags.mjs` per verificare la coerenza tra client, server,
> allowlist e admin primario. Lo script termina con exit code 1 se rileva problemi.

## 2. Rollout in Preview
1. Aggiorna le variabili Vercel (Preview) impostando:
   - `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1`
   - `CLUBS_ADMIN_EMAILS="admin@example.com,..."`
   - (facoltativo) `NEXT_PUBLIC_CLUBS_ADMIN_EMAILS` con la stessa lista in forma lowercase.
2. Esegui `vercel env pull preview` e rilancia
   `node scripts/check-clubs-flags.mjs --env-file .env.vercel.preview` se usi un wrapper,
   oppure esporta temporaneamente le variabili e lancia lo script localmente.
3. Deploya la PR/branch interessata, esegui la checklist `/clubs` come admin e come utente
   read-only, quindi monitora Sentry e Resend per eventuali errori.
4. Quando il test termina, puoi lasciare il flag attivo sul Preview per le prossime
   verifiche oppure disattivarlo riportando `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=0`.

## 3. Rollout in Production
1. Replica la configurazione del Preview su Production *solo* dopo aver completato tutti i
   test end-to-end.
2. Imposta `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1` e conferma che `CLUBS_ADMIN_EMAILS` contenga
   almeno l'account monitorato. Riavvia il deploy.
3. Appena online, accedi con l'account primario e verifica:
   - I pulsanti “Nuovo club”, “Modifica” e “Elimina” sono visibili.
   - Le API `/api/clubs` POST/PATCH/DELETE rispondono 200.
   - Non compaiono errori RLS in console/Sentry.
4. Mantieni il monitoraggio per le prime ore, annotando eventuali anomalie nel canale
   operativo.

## 4. Piano di rollback
Se qualcosa va storto:
1. Disattiva `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` (0) sui branch interessati.
2. Svuota `CLUBS_ADMIN_EMAILS` oppure rimuovi gli indirizzi problematici.
3. Redeploya (o forza un redeploy Vercel) per propagare i nuovi valori.
4. Esegui nuovamente `node scripts/check-clubs-flags.mjs` per confermare che la UI sia
   tornata read-only.

In casi critici puoi temporaneamente riportare `NEXT_PUBLIC_FEATURE_CLUBS_READONLY=1` e
lasciare l'allowlist invariata; la UI non mostrerà più i controlli CRUD mentre mantieni la
configurazione server pronta per un nuovo rollout.

## 5. Checklist finale
- [ ] `CLUBS_ADMIN_EMAILS` non vuota e sovrapposta con almeno un elemento di
      `ADMIN_EMAILS`.
- [ ] `node scripts/check-clubs-flags.mjs` → exit code 0.
- [ ] Smoke test `/clubs` (guest + admin) completati.
- [ ] Account primario monitorato loggato e registrato in `docs/smoke-tests/clubs.md`.
- [ ] Piano di rollback documentato sulla PR/deploy (link a questa guida).

Seguire questa procedura garantisce che il rollout del flag admin sia tracciabile,
auditabile e reversibile in pochi minuti.
