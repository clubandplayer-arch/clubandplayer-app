# Club&Player — Roadmap operativa
_Stato al 31/10/2025 — timezone: Europe/Rome_

## ✅ Fatto di recente
- Next 15: **viewport pass-2** completato (rimosso `metadata.viewport`, `export const viewport` centralizzato).
- **next/image**: allowlist domini (Dicebear + Supabase) in `next.config.ts`.
- **Email branding & resilienza**:
  - Endpoint `/api/notifications/send` con brand base URL + logo; no-op sicuro se ENV mancanti.
  - Endpoint `/api/notify-email` resiliente: invia se chiavi presenti, altrimenti risponde con `noop:true` o segnala env mancanti.
  - **E2E** Playwright per entrambi gli endpoint (+ security E2E per /api/clubs non autenticato).
- **/clubs** disabilitata (404) lato routing come da policy prodotto.
- **RLS hardening** su Supabase (policy idempotenti applicate).

## 🟡 In corso / PR
- Chiusura PR docs/email-branding (se non già mergiata).

## 🎯 Prossime 24–48h (ordine consigliato)
1) **E2E smoke aggiuntivi (bassa manutenzione)**: logout, apertura /feed loggato.
2) **Security** (light): password policy + OTP 900–1800s in Supabase.
3) **next/image pass-2** (quando comodo): migrazione immagini residue.

## 📌 Backlog mirato
- Sentry quick-smoke (facoltativo): POST `/api/debug/error` e verifica ingestion.
- Dataset località: doppio check copertura completa (inclusi Lazio/Roma e Sicilia/Siracusa già note).
