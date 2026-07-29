# Playbook mobile: push notifications Expo pronte per rilascio pubblico

Questo documento spiega a **Codex Mobile** come replicare il comportamento backend già implementato, in modo che il flusso push sia pronto per produzione.

## 1) Prerequisiti

- App mobile con autenticazione Supabase attiva (utente loggato).
- Expo Notifications configurato su iOS/Android (permessi runtime + device fisico per test reali).
- Backend web aggiornato con:
  - migrazione `push_tokens` applicata;
  - endpoint `/api/push-tokens/register` e `/api/push-tokens/disable` attivi;
  - dispatch push best-effort già collegato agli eventi notifica server.

## 2) Contratto API da rispettare

### 2.1 Registrazione token (login, app foreground, token refresh)

**Endpoint**: `POST /api/push-tokens/register`

**Body JSON**:

```json
{
  "token": "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "device_id": "stable-device-id"
}
```

**Regole**:
- `token` deve essere formato Expo (`ExpoPushToken[...]` o `ExponentPushToken[...]`).
- `platform` deve essere `ios` oppure `android`.
- `device_id` è opzionale ma fortemente consigliato (ID stabile del dispositivo).

### 2.2 Disabilitazione token (logout, revoke permessi, uninstall detection indiretta)

**Endpoint**: `POST /api/push-tokens/disable`

**Body JSON (opzioni)**:

```json
{ "token": "ExpoPushToken[...]" }
```

oppure

```json
{ "device_id": "stable-device-id" }
```

oppure disabilitazione totale account:

```json
{ "disable_all": true }
```

## 3) Sequenza mobile consigliata

1. **Dopo login**:
   - chiedi permesso notifiche;
   - ottieni Expo push token;
   - genera/recupera `device_id` stabile;
   - chiama subito `/api/push-tokens/register`.
2. **Ad ogni app open/foreground**:
   - ricalcola token corrente;
   - richiama `/api/push-tokens/register` (upsert idempotente lato backend).
3. **Su refresh token** (`addPushTokenListener`):
   - invia nuovamente `/api/push-tokens/register`.
4. **Su logout**:
   - chiama `/api/push-tokens/disable` con `token` o `device_id`;
   - solo dopo esegui sign-out locale.
5. **Se utente nega permessi**:
   - non chiamare register;
   - se aveva token precedente, chiamare disable by `device_id`.

## 4) Eventi che generano push (già cablati backend)

Il backend invia push best-effort quando crea una notifica applicativa per questi `kind`:

- `new_comment`
- `new_reaction`
- `application_received`
- `application_status`

I kind `message` e `new_message` sono esplicitamente esclusi dal dispatch push corrente.

## 5) Payload push da aspettarsi su mobile

Ogni push contiene almeno:

- `title`
- `body`
- `data.kind`
- `data.notificationId`

e, quando presente, metadati dominio (`post_id`, `comment_id`, `opportunity_id`, `application_id`, `status`, ecc.).

### Routing suggerito in app

- `new_comment` / `new_reaction` -> dettaglio post o feed.
- `application_received` -> inbox candidature club.
- `application_status` -> dettaglio candidatura atleta.
- fallback -> schermata `/notifications`.

## 6) Robustezza richiesta prima del go-live

- **Retry con backoff** su `register/disable` in caso di errore rete (non bloccare UX).
- **Debounce**: evitare raffiche duplicate in pochi secondi.
- **Idempotenza client**: se token/device non cambia, evita chiamate inutili ma mantieni heartbeat a ogni open app.
- **Observability**: loggare in mobile `userId`, `device_id`, ultime 4-6 cifre hash token (mai il token completo).

## 7) Test plan minimo (release gate)

1. Login su iOS -> register 200.
2. Login su Android -> register 200.
3. Creazione evento `new_comment` -> ricezione push su destinatario corretto.
4. Cambio stato candidatura -> push `application_status` ricevuta.
5. Logout -> disable 200, nessuna push successiva su quel device.
6. Login stesso utente su 2 device -> push ricevuta su entrambi.
7. Revoca permesso OS -> disable by `device_id` e stop invii.

## 8) Checklist finale per produzione

- [ ] Endpoint push token integrati nel client mobile.
- [ ] Deep-link routing per tutti i `kind` supportati.
- [ ] Fallback sicuro su centro notifiche.
- [ ] QA completata su device fisici iOS + Android.
- [ ] Logging/monitoring attivo su errori register/disable.
- [ ] Runbook support condiviso (come disattivare token utente rapidamente).

Con questa integrazione, il mobile replica il comportamento backend già in produzione e rende il canale push affidabile per il rilascio pubblico.
