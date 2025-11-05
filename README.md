cat > README.md <<'EOF'
# Club and Player

“Club and Player” è una piattaforma social che mette in contatto società sportive dilettantistiche e atleti, ispirata ai flussi di LinkedIn.  
Stack: **Next.js 15.5**, **React 19**, **TypeScript**, **Tailwind**, **Supabase** (Auth/Storage/DB), **Vercel** (deploy), **Sentry** (monitoring), **Playwright** (E2E), **pnpm 10**.

## Struttura repository
- `app/` – App Router (pagine + route handlers).
- `components/` – UI condivisa (es. mini-card profilo).
- `lib/`, `hooks/`, `types/` – helpers, hook e tipizzazioni.
- `public/` – asset statici.
- `supabase/` – client e note di schema (se presenti).
- `docs/` – documentazione di progetto.

## Requisiti locali
- **Node.js 18+**
- **pnpm 10** (il repo è **pinnato** a `pnpm@10.17.1` via `packageManager`).
- Variabili d’ambiente in `.env.local`:
  ```bash
  # Supabase (client web)
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...

  # Supabase (server fallback: handler/API/server)
  SUPABASE_URL=...           # opzionale, fallback coerente lato server
  SUPABASE_ANON_KEY=...      # opzionale, fallback coerente lato server

  # Sentry / altre integrazioni (se usate)
  # SENTRY_DSN=...
