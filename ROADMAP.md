# Club&Player — Roadmap operativa
_Stato al 31/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- CP21: API `/api/clubs` (GET/POST) e `/api/clubs/[id]` (GET/PATCH/DELETE)
- ClubForm con cascade Regione → Provincia → Comune (Supabase)
- **/clubs** disabilitata: 404 forzato via `middleware.ts`
- E2E smoke (Playwright): home, login, /clubs 404, /api/health
- Next 15: **viewport pass-2** (centralizzato in `app/viewport.ts`)
- **next/image pass-1**: componenti core migrati + allowlist (Dicebear + Supabase)
- Tag stabile: `v2025.10.30-stable`
- **Supabase security hardening**: RLS su `public.profiles` e `public.clubs` (SELECT solo autenticati; INSERT/UPDATE/DELETE legate a `auth.uid()`); Password min 12; OTP 900–1800s; Secure email change ON

## 🟡 In corso / PR
- Nessuna critica aperta (main allineato).

## 🎯 Prossime 24–48h
1) E2E **API security**: 401 per accesso non autenticato a `/api/*` protette
2) Email branding (logo e URL prod) – check finale e screenshot
3) next/image **pass-2** (componenti rimanenti a bassa priorità)

## 📌 Backlog mirato
- HIBP: attivare quando disponibile sul piano
- E2E: flusso `redirect_to` OAuth (PKCE/implicit) su domini preview/prod
