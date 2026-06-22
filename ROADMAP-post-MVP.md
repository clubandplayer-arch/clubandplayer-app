# Club and Player — Roadmap post-MVP
_Stato iniziale: 04/11/2025 — timezone: Europe/Rome_  
_Base: Next.js 15.5 · React 19 · TypeScript · Supabase (Auth/DB/Storage) · Vercel · Sentry · Smoke test Node · pnpm 10.17.1_

> Questa roadmap copre il periodo post-MVP. Ogni voce ha un ID progressivo (PM-xx), una checklist eseguibile e criteri di accettazione. Aggiorniamo questo file a ogni passaggio.

---

## 🔢 Milestones (PM-xx)
Legenda: ☐ todo · ◐ in corso · ✅ fatto

| ID    | Titolo                                                | Stato | Tipo     |
|-------|--------------------------------------------------------|-------|----------|
| PM-01 | Email **reali** (Resend)                               | ✅    | feature  |
| PM-02 | Snellimento bundle **read-only**                       | ✅    | perf     |
| PM-03 | **A11y & UX sweep** (pagine principali)                | ✅    | qualità  |
| PM-04 | **/clubs edit** dietro **flag admin** (riapertura CRUD) | ✅    | feature  |
| PM-05 | Ricerca/filtri UI **/search/club**                     | ✅    | feature  |
| PM-06 | **Security** Supabase (policy, OTP, HIBP, RLS)         | ✅    | security |
| PM-07 | **Sentry tuning** (env/release + regole)               | ✅    | qualità  |
| PM-08 | **CI/CD**: E2E “quasi-bloccanti” + artifacts           | ✅    | devops   |
| PM-09 | **Docs & Onboarding** dev                              | ✅    | docs     |
| PM-10 | **Performance**: immagini/storage/caching              | ✅    | perf     |
| PM-11 | **Legal**: privacy/termini + cookie note               | ✅    | legal    |
| PM-12 | **Analytics** di base (privacy-safe)                    | ✅    | ops      |

---

## Dettaglio milestone

### PM-01 — Email **reali** (Resend)
**Obiettivo:** passare da NOOP a invio reale su prod/preview.  
**Checklist**
- ✅ Imposta su Vercel (prod/preview): `RESEND_API_KEY`, `BRAND_FROM`, `BRAND_REPLY_TO`.
- ✅ Disattiva NOOP: `NOOP_EMAILS=0` (o rimuovi il guard).
- ✅ Test API su preview protetta: `POST /api/notify-email` e `POST /api/notifications/send` → 200 e mail in inbox.
- ✅ Verifica rendering client (Gmail web, iOS Mail, Android Gmail).
**Accettazione**
- Email ricevute correttamente; Sentry senza errori; log Vercel puliti.

---

### PM-02 — Snellimento bundle **read-only**
**Obiettivo:** evitare import di `Modal`/`ClubForm` quando non necessari.  
**Checklist**
- ✅ Dynamic import (o code-split) dei componenti “edit” dietro flag `readOnly=false`.
- ✅ Confronto `next build` → First Load JS uguale o minore.
**Accettazione**
- Nessuna regressione UI; dimensione bundle invariata o ridotta.

---

### PM-03 — **A11y & UX sweep**
**Obiettivo:** accessibilità minima WCAG AA su `/login`, `/feed`, `/profile`, `/search/*`.
**Checklist**
- ✅ Landmark semantici e skip link globale; ogni pagina target espone un H1, alt text descrittivi e helper per screen reader.
- ✅ Contrasto minimo su CTA e testi primari grazie ai token tailwind/globals già presenti (verificato con Axe).
- ✅ Navigazione da tastiera: ordine di tab corretto, `:focus-visible` personalizzato e messaggi `aria-live` per errori/stati.
**Accettazione**
- Axe DevTools: zero “critical” sulle pagine target (feed/login/profile/search).
**Stato attuale**
- Layout con skip link e contenitore `#main-content`, form login con label esplicite, `/feed` e `/search/club` con annunci `aria-live` e heading coerenti; `FeedComposer`/`PostItem` ora rispettano i limiti e forniscono feedback comprensibili.

---

### PM-04 — **/clubs edit** dietro **flag admin**
**Obiettivo:** riaprire CRUD club solo a ruoli abilitati.  
**Checklist**
- ✅ Feature flag UI: `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1`.
- ✅ Server allowlist: `CLUBS_ADMIN_EMAILS` (comma-separated).
- ✅ Runbook rollout/rollback: [`docs/feature-flags/clubs-admin-rollout.md`](docs/feature-flags/clubs-admin-rollout.md).
- ✅ Bottoni edit/delete/create visibili solo se admin.
- ✅ Guard server su API (check ruolo/allowlist).
- ✅ E2E: scenario admin vs non-admin.
**Accettazione**
- Non-admin: pagina read-only (o 404 secondo policy). Admin: CRUD ok.

---

### PM-05 — Ricerca/filtri UI **/search/club**
**Obiettivo:** UI con filtri geo (regione/provincia/comune) + `q`.  
**Checklist**
- ✅ Connetti la UI a `/api/clubs` (`q`, `page`, `pageSize`, filtri geo).
- ✅ Usa indici `pg_trgm` già creati + indice `created_at`.
- ✅ Snapshot E2E: ricerca e paginazione.
**Accettazione**
- Ricerca fluida (<300ms su dataset normale), paginazione corretta.

---

### PM-06 — **Security** Supabase
**Obiettivo:** policy minime certe + RLS ok.  
**Checklist**
- ✅ Password policy: lunghezza ≥ 12, numero + speciale.
- ✅ OTP expiry: 900–1800s; secure password change.
- ✅ HIBP: abilitarlo quando disponibile sul piano (o pianificare upgrade).
- ✅ RLS review `profiles`, `clubs` (WITH CHECK coerenti).
**Accettazione**
- Test manuale policy/OTP; nessuna regressione RLS.

**Stato attuale**
- Policy password/OTP allineate via migrazione `20250923_supabase_security.sql`; HIBP resta pianificato come upgrade e documentato.

---

### PM-07 — **Sentry** tuning
**Obiettivo:** eventi puliti per ambiente/release + regole.
**Checklist**
- ☐ Imposta (facoltativo ma consigliato): `SENTRY_ENVIRONMENT=production`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`.
- ☐ Release client visibile: `NEXT_PUBLIC_SENTRY_RELEASE=${VERCEL_GIT_COMMIT_SHA}` (opzionale).
- ☐ Regole/ignore: errori rumorosi (offline, ResizeObserver, ecc.).
**Accettazione**
- Dashboard pulita; alert solo su errori reali.

**Stato attuale**
- Le configurazioni Sentry client/server rispettano `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` e la release opzionale (`SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` o `VERCEL_GIT_COMMIT_SHA`).

---

### PM-08 — **CI/CD** (E2E “quasi-bloccanti” + artifacts)
**Obiettivo:** alzare il segnale CI senza bloccare il flusso, riutilizzando lo smoke test Node o estendendolo.
**Checklist**
- ✅ Salva log/trace degli smoke test (`pnpm test:e2e`) come artifact GitHub Actions.
- ✅ Modalità “quasi-bloccante”: fallire PR che toccano `app/**` o `api/**` se gli smoke falliscono (flag `SMOKE_ENFORCE`).
- ✅ (Facoltativo) Reintrodurre Playwright per scenari completi se torna necessario. _(Nota: valutata, non necessaria ora; documentato come opzione futura.)_
**Accettazione**
- Artifact disponibili per ogni run; policy PR configurabile.
**Stato attuale**
- Il workflow `E2E (non-blocking)` carica `smoke-artifacts` (log + metadata) e rispetta `SMOKE_ENFORCE`/`SMOKE_ENFORCE_PATHS` per bloccare PR su percorsi critici; Playwright resta opzionale e può essere riattivato più avanti.

---

### PM-09 — **Docs & Onboarding** dev
**Obiettivo:** repo self-service per nuovi dev.
**Checklist**
- ✅ README con setup ≤15 minuti (Node 22 + pnpm 10.17.1), env richieste e comando smoke test.
- ✅ Nuova guida [`docs/dev-onboarding.md`](docs/dev-onboarding.md) con troubleshooting per variabili Vercel, auth callback, storage e Sentry.
- ✅ Sezione “Troubleshooting onboarding” nel README con link rapidi agli script di diagnosi (`check-feed`, `check-sentry`, ecc.).
**Accettazione**
- Un nuovo dev avvia il progetto in < 15 minuti (setup verificato e documentato).

---

### PM-10 — **Performance**
**Obiettivo:** migliorare TTI/LCP.
**Checklist**
- ✅ `next/image` configurato con domini Supabase, formati AVIF/WebP, `sizes`/lazy sui componenti che mostrano avatar e loghi.
- ✅ Header `Cache-Control` per `/_next/static`, `/_next/image` e asset pubblici, con TTL lunghi lato CDN.
- ✅ Profiling manuale delle pagine feed/club per assicurare assenza di carichi media non necessari.
**Accettazione**
- Lighthouse ≥ 90 su pagine target (desktop).
**Stato attuale**
- `next.config.ts` applica ora caching aggressivo e ottimizzazioni immagini, mentre i componenti (`FeedCard`, `ClubsTable`, `/search/club`) specificano esplicitamente `sizes`/lazy per ridurre il LCP.

---

### PM-11 — **Legal**
**Obiettivo:** allineamento privacy/termini.
**Checklist**
- ✅ Review `/legal/privacy` e `/legal/terms` con sezioni su titolare, basi giuridiche, conservazione e responsabilità.
- ✅ Cookie disclosure aggiornata per descrivere analytics essenziale e rispetto del segnale Do Not Track.
**Accettazione**
- Testi aggiornati; link visibili nel footer.
**Stato attuale**
- Le pagine `/legal/privacy`, `/legal/terms` e la nuova `/legal/beta` includono titolare, basi giuridiche, condizioni del programma Beta e link nel footer; il testo condivisibile è archiviato anche in `docs/legal/beta-invite.md`.

---

### PM-12 — **Analytics** (privacy-safe)
**Obiettivo:** telemetria minima rispettosa.
**Checklist**
- ✅ Loader client compatibile con Plausible, opzionale via `NEXT_PUBLIC_ANALYTICS_*`, senza cookie di terze parti.
- ✅ Rispetto DNT e consenso cookie (`cp-consent-v1`); eventi aggregati inviati tramite `window.plausible`.
**Accettazione**
- Pageviews base su production; nessun alert privacy.
**Stato attuale**
- `PrivacyAnalytics` carica lo script solo con consenso esplicito e DNT disattivato, mentre `lib/analytics` e i componenti di tracking inviano eventi aggregati attraverso l’API Plausible-like (inclusi conversioni candidature e retention giornaliera con ID troncati).

---

## 📌 Note operative
- **Branch protection**: mantieni “Lint” e “Type check” required; E2E per ora non-bloccanti.
- **Feature flags** (esempi):
  - `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` — abilita UI admin per /clubs edit
  - `NOOP_EMAILS` — 1/0 per mockare o inviare email reali
- **Ambienti**: lato server usa `VERCEL_ENV` come fonte verità; lato client variabili `NEXT_PUBLIC_*`.
- **Supporto/triage Beta**: `BRAND_REPLY_TO` deve puntare all'alias `support@clubandplayer.com` (team Operazioni) e gli alert Sentry devono arrivare su Slack `#beta-triage` come descritto in [`docs/support/beta-triage.md`](docs/support/beta-triage.md).

---
