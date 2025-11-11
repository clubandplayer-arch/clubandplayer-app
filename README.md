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
- pnpm 10 (il progetto blocca `pnpm@10.17.1` tramite `packageManager`).
- Variabili d'ambiente Supabase salvate in `.env.local`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_URL=...                    # facoltativo, fallback per le API server-side
  SUPABASE_ANON_KEY=...               # facoltativo, fallback per le API server-side
  SUPABASE_SERVICE_ROLE_KEY=...       # opzionale per script amministrativi
  ```
  Utilizza sempre lo stesso set di URL/chiavi sia in locale sia su Vercel per evitare incongruenze.

## Flusso di lavoro consigliato
Questi passaggi ti guidano dall'aggiornamento della tua copia locale fino al deploy su Vercel.

1. **Recupera l'ultima versione del codice**
   ```bash
   git checkout work
   git pull origin work
   ```
2. **Crea un branch per la modifica che vuoi eseguire**
   ```bash
   git checkout -b nome-branch-descrittivo
   ```
3. **Installa (o aggiorna) le dipendenze**
   ```bash
   corepack enable
   pnpm install
   ```
4. **Applica le modifiche al codice**
   - Modifica i file necessari nella directory `app/`, `components/` o dove richiesto.
   - Salva ogni file interessato.
5. **Esegui i controlli locali**
   ```bash
   pnpm lint
   pnpm test   # quando saranno disponibili test automatici
   pnpm run type-check
   pnpm dev    # opzionale, per verificare manualmente su http://localhost:3000
   ```
6. **Verifica lo stato dei file**
   ```bash
   git status
   ```
   Assicurati che compaiano solo i file che intendi inviare.
7. **Prepara il commit**
   ```bash
   git add percorso/file1 percorso/file2
   git commit -m "Messaggio chiaro e descrittivo"
   ```
8. **Invia il branch remoto**
   ```bash
   git push origin nome-branch-descrittivo
   ```
9. **Apri la Pull Request su GitHub**
   - Vai sul repository su GitHub.
   - Seleziona il tuo branch appena pushato e crea la PR verso `work` (o il branch target concordato).
   - Compila titolo e descrizione indicando cosa hai cambiato e come testare.

## Controllare il deploy su Vercel
1. Dopo il merge o dopo l'apertura della PR (se esiste un Preview), accedi alla dashboard di Vercel del progetto.
2. Controlla la scheda **Deployments**: la PR dovrebbe avviare una build automatica.
3. Se la build fallisce, clicca sul deployment per leggere i log di errore e correggere il problema nel codice.
4. Una volta che la build è **Successful**, apri il link del preview o del production deploy per verificare manualmente le funzionalità interessate.

## Risorse utili
- [Documentazione Next.js](https://nextjs.org/docs)
- [Documentazione Supabase](https://supabase.com/docs)
- [Documentazione pnpm](https://pnpm.io/motivation)

Segui questi passaggi ogni volta che applichi modifiche: garantiscono che il repository locale resti sincronizzato e che Vercel possa completare il deploy senza sorprese.
