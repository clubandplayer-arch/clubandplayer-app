# Supporto & triage — Beta chiusa

Questa nota descrive chi presidia la casella email configurata tramite `BRAND_REPLY_TO` e come vengono gestiti gli errori critici che arrivano da Sentry (escalation verso Slack) durante il programma Beta.

## Casella Resend (`BRAND_REPLY_TO`)
- **Valore in produzione:** `support@clubandplayer.com` (alias condiviso del team Operazioni).
- **Accesso:** Google Workspace → gruppo `support@clubandplayer.com` con membri Chiara (owner) e Luca (backup). Entrambi ricevono anche i forward automatici generati da Resend per le risposte.
- **Routine:**
  1. Controllo inbox due volte al giorno (09:30 e 17:30 CET).
  2. Risposte dirette entro 24h; se serve assistenza tecnica si apre un ticket interno taggato `beta-support` in Linear.
  3. Gli scambi più rilevanti (es. bug confermati) vengono riassunti nel canale Slack `#beta-triage` per dare visibilità al team.
- **Fallback:** se nessuno dei due è disponibile, l’alias viene temporaneamente inoltrato a `ops@clubandplayer.com` e il banner nel README ricorda di aggiornare `BRAND_REPLY_TO` solo dopo aver configurato l’alias.

## Canale di escalation (Sentry → Slack)
- **Progetto Sentry:** `clubandplayer-app` (client+server). Environment valorizzato tramite `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT`.
- **Integrazione Slack:** canale `#beta-triage` con il workflow “Sentry Alerts” (livello `error` e `fatal`, filtri sugli endpoint `/api/*` e `/feed`). L’integrazione è stata collegata il 09/03/2025 e testata con `node scripts/check-monitoring.mjs --send-event`.
- **Gestione alert:**
  1. L’on-call di supporto (stessa rotazione della casella email) prende in carico l’alert Slack, aggiunge il tag `triage:in-progress` su Sentry e verifica se l’errore è riproducibile.
  2. Se l’errore riguarda un endpoint pubblico (es. `/api/feed/posts`), viene creato un issue GitHub/Linear con link all’evento Sentry; per errori da utenti Beta si risponde anche all’email originale per chiudere il loop.
  3. Una volta risolto, l’alert viene marcato come `Resolved` in Sentry e viene postato un breve aggiornamento nel canale Slack.

## Escalation rapida
1. Email critica (es. impossibilità accesso) → risposta entro 2h, mention `@eng-oncall` in `#beta-triage`.
2. Alert Sentry ripetuto (>3 eventi in 10 minuti) → aprire `#incidents` e allertare il PM Beta.
3. Se il problema impatta i dati personali, coinvolgere subito `privacy@clubandplayer.com` e seguire la procedura DPIA.

> Ultimo aggiornamento: 09/03/2025 — owner: Team Operazioni.
