# Club&Player — Roadmap post-MVP
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
| PM-03 | **A11y & UX sweep** (pagine principali)                | ☐     | qualità  |
| PM-04 | **/clubs edit** dietro **flag admin** (riapertura CRUD) | ✅    | feature  |
| PM-05 | Ricerca/filtri UI **/search/club**                     | ✅    | feature  |
| PM-06 | **Security** Supabase (policy, OTP, HIBP, RLS)         | ✅    | security |
| PM-07 | **Sentry tuning** (env/release + regole)               | ✅    | qualità  |
| PM-08 | **CI/CD**: E2E “quasi-bloccanti” + artifacts           | ✅    | devops   |
| PM-09 | **Docs & Onboarding** dev                              | ☐     | docs     |
| PM-10 | **Performance**: immagini/storage/caching              | ☐     | perf     |
| PM-11 | **Legal**: privacy/termini + cookie note               | ☐     | legal    |
| PM-12 | **Analytics** di base (privacy-safe)                    | ☐     | ops      |

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
- ☐ Landmark semantici, H1 per pagina, alt text sensati, focus ring visibile.
- ☐ Contrasto minimo su testi/CTA principali.
- ☐ Tastiera: tab order corretto, “skip to content”.  
**Accettazione**
- Axe DevTools: zero “critical” sulle pagine target.

---

### PM-04 — **/clubs edit** dietro **flag admin**
**Obiettivo:** riaprire CRUD club solo a ruoli abilitati.  
**Checklist**
- ✅ Feature flag UI: `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN=1`.
- ✅ Server allowlist: `CLUBS_ADMIN_EMAILS` (comma-separated).
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
- ☐ README: setup locale (Node 22, pnpm 10.17.1), env richieste, run dev/build/test.
- ☐ Sezione “Feature flags” con spiegazioni.
- ☐ “Troubleshooting” (Vercel build, auth callback, storage, Sentry).  
**Accettazione**
- Un nuovo dev avvia il progetto in < 15 minuti.

---

### PM-10 — **Performance**
**Obiettivo:** migliorare TTI/LCP.  
**Checklist**
- ☐ Verifica `next/image`: lazy, dimensioni coerenti, `priority` dove serve.
- ☐ Caching lato CDN per contenuti pubblici (se applicabile).
- ☐ Micro-profiling pagine più pesanti.  
**Accettazione**
- Lighthouse ≥ 90 su pagine target (desktop).

---

### PM-11 — **Legal**
**Obiettivo:** allineamento privacy/termini.  
**Checklist**
- ☐ Review `/legal/privacy` e `/legal/terms`.
- ☐ Cookie disclosure minima (se/quando introdurrai analytics).  
**Accettazione**
- Testi aggiornati; link visibili nel footer.

---

### PM-12 — **Analytics** (privacy-safe)
**Obiettivo:** telemetria minima rispettosa.  
**Checklist**
- ☐ Integra soluzione privacy-first (server-side o client con anonimizzazione IP).
- ☐ Escludi route private; rispetta Do Not Track.  
**Accettazione**
- Pageviews base su production; nessun alert privacy.

---

## 📌 Note operative
- **Branch protection**: mantieni “Lint” e “Type check” required; E2E per ora non-bloccanti.
- **Feature flags** (esempi):  
  - `NEXT_PUBLIC_FEATURE_CLUBS_ADMIN` — abilita UI admin per /clubs edit  
  - `NOOP_EMAILS` — 1/0 per mockare o inviare email reali
- **Ambienti**: lato server usa `VERCEL_ENV` come fonte verità; lato client variabili `NEXT_PUBLIC_*`.

---
