# Monitoraggio & Alerting

Questa guida descrive come verificare rapidamente che Sentry e l'analytics
privacy-first siano configurati correttamente e come predisporre gli alert
minimi richiesti per la Beta (feed e API critiche).

## 1. Verifica configurazione (script `check-monitoring`)

```
node scripts/check-monitoring.mjs --env-file .env.local --env-file .env.vercel.production
```

Lo script confronta le variabili fondamentali per Sentry (DSN, environment,
release) e per l'analytics Plausible-like. Esempio di output atteso:

```
== Monitoraggio ==
Sentry DSN: configurato
Sentry environment: production
Sentry release: e091907
Analytics domain: analytics.clubandplayer.com
```

Se serve un'evidenza per la PR/deploy, aggiungi `--send-event`: lo script
invierà un messaggio "[monitoring-check] ping" a Sentry usando la stessa
release/environment in modo che sia immediato verificarlo dalla UI.

> **Nota**: lo script blocca immediatamente se rileva variabili che
> bypasserebbero il consenso (es. `NEXT_PUBLIC_ANALYTICS_AUTOLOAD=1`).

## 2. Privacy analytics (consenso + DNT)

Il componente `PrivacyAnalytics` viene montato in `app/layout.tsx` ma carica lo
script Plausible solo se:

1. l'utente ha accettato tutti i cookie (`CookieConsent` salva `cp-consent-v1`);
2. il browser non ha Do Not Track attivo;
3. `NEXT_PUBLIC_ANALYTICS_DOMAIN` è valorizzato.

In caso contrario, i log del browser mostreranno messaggi espliciti che è la
modalità prevista per la Beta.

### Web Vitals reali

`WebVitalsReporter` (montato in `app/layout.tsx`) importa in modo lazy la
runtime `web-vitals` di Next e invia eventi anonimi (CLS, FID, INP, LCP, TTFB)
tramite il client Plausible-like. I payload includono solo valore, rating e
qualche hint di rete (`navigator.connection.effectiveType`). Controlla in
DevTools che le chiamate all'endpoint Plausible corrispondano agli eventi
`web_vital_*` quando la policy cookie è accettata.

## 3. Alert per feed e API

Definisci due regole Issue Alert in Sentry (Project Next.js):

| Nome alert              | Condizione                                         | Azione                                   |
| ----------------------- | -------------------------------------------------- | ---------------------------------------- |
| `API errors (>=1/min)`  | `event.type:error` + tag `layer:api`               | Slack/email + assegnazione responsabile |
| `Feed failures`         | tag `endpoint:/api/feed/posts*` o route `/feed/*`  | Slack/email + issue auto-resolved        |

I nuovi helper `reportApiError` sono già usati dai route handler del feed, così
ogni errore server-side allega i tag `layer=api` e `endpoint`. Estendi la stessa
funzione sugli endpoint critici se servono alert più granulari.

## 4. Log dei check

Salva i risultati dei comandi in `docs/monitoring/checks/<YYYY-MM-DD>.md` per
allegarli alla PR o al changelog di release.
