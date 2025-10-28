# Club and Player

"Club and Player" è una piattaforma social che mette in contatto società sportive dilettantistiche e atleti, ispirata al flusso di lavoro di LinkedIn. Il progetto è costruito con [Next.js](https://nextjs.org/) e fa uso di Supabase per autenticazione e gestione dati.

## Struttura del repository
- `app/`: pagine e route handlers dell'app Next.js (App Router).
- `components/`: componenti UI condivisi, incluse le mini-card di profilo.
- `lib/`, `hooks/`, `types/`: funzioni di supporto, hook e definizioni TypeScript.
- `supabase/`: definizioni del client e schema utilizzato per l'integrazione con Supabase.
- `public/`: asset statici disponibili direttamente dal client.

## Requisiti locali
- Node.js 18 o superiore.
- pnpm 8 (consigliato) oppure npm/yarn/bun.
- Variabili ambiente di Supabase salvate in un file `.env.local` (consulta `supabase/README.md` se presente oppure la documentazione interna del team).

## Flusso di lavoro consigliato
Questi passaggi ti guidano dall'aggiornamento della tua copia locale fino al deploy su Vercel.

1. **Recupera l'ultima versione del codice**
   ```bash
   git checkout work
   git pull origin work
