# Club&Player — Roadmap operativa
_Stato al 31/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- CP21: API `/api/clubs` (GET/POST) e `/api/clubs/[id]` (GET/PATCH/DELETE)
- ClubForm con cascade Regione → Provincia → Comune (Supabase)
- **/clubs** disabilitata: 404 forzato (middleware) + test E2E
- E2E smoke (Playwright): home, login, /clubs 404, /api/health
- **Security E2E (anon):** blocco non autenticato su `/api/clubs`, `/api/clubs/[id]`, `POST /api/clubs`
- **Email branding resilient:** endpoint `/api/notifications/send` e `/api/notify-email` con `noop:true` se ENV mancanti + test E2E
- Next 15: **viewport pass-2** centralizzato (restano warning da chiudere nel pass-3)
- **next/image pass-1** componenti core + **allowlist domini** (Dicebear + Supabase) in `next.config.ts`
- Sentry: config unificata client/server con environment corretto
- RLS hardening (policy su `profiles` e `clubs`)
- Tag stabile: `v2025.10.30-stable`

## 🟡 In corso / PR aperte
- Nessuna critica aperta (main allineato).

## �� Prossime 24–48h
1) **Viewport pass-3 (cleanup finale)**  
   Migrare i file che hanno `metadata.viewport` ad `export const viewport`.
2) **CP21 – Clubs UI wiring (solo lettura dove serve)**  
   - Lista/paginazione client già collegata; confermare filtri DB opzionali (Regione/Provincia/Città) quando i campi saranno presenti in schema.
3) **Quality gates**  
   - ESLint v9 (flat) già allineato. Mantenere warning a zero nei nuovi file.
4) **E2E**  
   - Aggiungere test minimi di /login → callback (mock/smoke) e /logout già coperto.

## 📌 Note
- Vercel: warning “Unsupported metadata viewport…” non bloccanti (da chiudere nel pass-3).
- Playwright: artefatti ignorati via `.gitignore` (test-results/, playwright-report/).
