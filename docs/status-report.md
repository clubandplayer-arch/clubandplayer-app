# Status Report — Post-MVP (v2025.11.04-mvp)

Questo documento fotografa lo stato corrente dopo la chiusura MVP, per allineare rapidamente team e collaboratori.

## Contesto
- App: **Next 15.5 / React 19 / TS / Tailwind**.
- Backend: **Supabase** (Auth/Storage/DB).
- Delivery: **Vercel**; package manager **pnpm@10.17.1**.
- Monitoring: **Sentry** collegato (env + release).
- Test: **E2E locali**; **CI non-bloccante**.

## Stato attuale (breve)
- ✅ **MVP chiusa** (tag `v2025.11.04-mvp`).
- ✅ **/clubs disabilitata (404)**.
- ✅ **Sentry OK** (env + release tagging).
- ✅ **Viewport pulito**; **next/image** con allowlist.
- ✅ **Ricerca club veloce**: indici `pg_trgm` + `ANALYZE`.
- 🟡 **E2E**: verdi in locale; in CI attualmente non-bloccanti.

## Riferimenti roadmap “post-MVP”
- La roadmap operativa è nel file `ROADMAP-post-MVP.md` (milestone **PM-01 … PM-12**).
- Modalità: un branch per PM (`pm-xx-descrizione`), PR piccole con smoke su Vercel.

## Come usare questo file
- Allegalo in chat/issue come **riassunto**.
- Aggiorna i bullet quando chiudiamo milestone o modifichiamo priorità.