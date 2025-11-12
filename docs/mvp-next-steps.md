# MVP "Club & Player" – checklist operativa

Questo file riassume le attività prioritarie da passare al supporto ChatGPT/assistenza tecnica per completare la MVP dopo le ultime correzioni.

## 1. Allineare il profilo atleta
- Verificare che il form salvi `foot` con valori `right`, `left`, `both` e aggiorni Supabase di conseguenza.
- Popolare i menu a tendina con l’elenco completo degli sport di squadra (`TEAM_SPORTS`).
- Mantenere sincronizzati bio, statura, peso e link social con le API `/api/profiles/me`.

## 2. Migliorare la bacheca (feed)
- Implementare il composer: POST su `/api/feed/posts`, toast di conferma, refresh della lista.
- Rendere dinamiche le sezioni laterali:
  - "Trending" → opportunità più viste nell’ultima settimana da Supabase.
  - "Chi seguire" → suggerimenti filtrati per sport/zona (rimuovere i mock).
  - Box "Profili seguiti" sempre visibile dopo il follow.
- Introdurre la colonna pubblicitaria (tabella `ads` o equivalente) con targeting geografico.

## 3. Repository e API
- Rimuovere definitivamente i fallback mock in `lib/data/*.ts` una volta verificate le query reali.
- Completare le API mancanti per follow, viste salvate e matching geografico.
- Aggiungere test o script di smoke test per opportunità e candidature.

## 4. QA e deploy
- Eseguire `pnpm lint`, `pnpm run build` e test manuali di login (Google + email) ad ogni ciclo.
- Aggiornare la PR con log dettagliati e verificare il deploy Vercel (preview + produzione).
- Documentare nel README eventuali variabili ambiente aggiuntive (es. storage avatar, tabella ads).

Condividi questo file quando richiedi supporto: contiene il contesto minimo per proseguire senza perdere tempo.
