# README.md
# Club and Player

"Club and Player" è una piattaforma social che mette in contatto società sportive dilettantistiche e atleti, ispirata al flusso
di lavoro di LinkedIn. Il progetto è costruito con [Next.js](https://nextjs.org/) e fa uso di Supabase per autenticazione e gestione dati.

## Struttura del repository
- `app/`: pagine e route handlers dell'app Next.js (App Router).
- `components/`: componenti UI condivisi, incluse le mini-card di profilo.
- `lib/`, `hooks/`, `types/`: funzioni di supporto, hook e definizioni TypeScript.
- `supabase/`: definizioni del client e schema utilizzato per l'integrazione con Supabase.
- `public/`: asset statici disponibili direttamente dal client.

## Requisiti locali
- Node.js 18 o superiore.
- pnpm 10 (il progetto blocca `pnpm@10.17.1` tramite `packageManager`).
- Variabili d'ambiente Supabase salvate in `.env.local`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_URL=...                    # facoltativo, fallback per le API server-side
  SUPABASE_ANON_KEY=...               # facoltativo, fallback per le API server-side
  SUPABASE_SERVICE_ROLE_KEY=...       # opzionale per script amministrativi
