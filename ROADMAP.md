# Club&Player — Roadmap operativa
_Stato al 30/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- CP21: API `/api/clubs` (GET/POST) e `/api/clubs/[id]` (GET/PATCH/DELETE)
- ClubForm con cascade Regione → Provincia → Comune (Supabase)
- **/clubs** disabilitata: 404 forzato via `middleware.ts`
- E2E smoke (Playwright): home, login, /clubs 404, /api/health
- Next 15: **viewport pass-2** (rimosso `metadata.viewport`, centralizzato in `app/viewport.ts`)
- **next/image pass-1**: componenti core migrati
- Tag stabile: `v2025.10.30-stable`

## 🟡 In corso / PR
- Nessuna critica aperta (main allineato).

## 🎯 Prossime 24–48h (ordine consigliato)
1) **ESLint v9 flat-config definitivo**
   - Consolidare `eslint.config.js`
   - Allineare pacchetti `@typescript-eslint`
   - Ripulire `eslint-disable` orfani
2) **Sentry Verify (EU DSN)**
   - Verifica eventi da `/api/debug/error` e da client
3) **E2E estesi**
   - CTA “Login con Google” su `/login`
   - Onboarding: ChooseRole → Club → salvataggio geo
4) **Ricerca/filtri DB**
   - Filtri geo su `/search/club` (region/province/municipality/sport)
5) **Security (Supabase)**
   - Password policy, OTP 900–1800s, HIBP quando disponibile, RLS extra

## 📌 Note operative
- CI: branch protection su “Lint” e “Type check”
- Supabase: Google OAuth ➜ `/auth/callback`; env coerenti su Vercel
- Sentry: DSN EU configurati (verificare ingestion)
