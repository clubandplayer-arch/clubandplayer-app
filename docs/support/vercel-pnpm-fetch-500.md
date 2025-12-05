# Nota deploy Vercel — ERR_PNPM_FETCH_500

Branch: `codex/add-onboarding-box-in-dashboard`
Job: ONB-01 – Onboarding “primi passi” in dashboard.

## Stato del branch
- Il codice modifica solo la UI (helper di completezza profilo + FirstStepsCard sopra il composer).
- Nessuna modifica a `package.json`, `pnpm-lock.yaml`, workflow CI o impostazioni Vercel.
- Il branch è tecnicamente sano: la logica è locale alla dashboard e non tocca build/config.

## Errore osservato su Vercel
Durante l'install iniziale, Vercel fallisce prima di installare le dipendenze perché non riesce a scaricare **pnpm@10.17.1**
dal registry npm:

```
ERR_PNPM_FETCH_500 GET https://registry.npmjs.org/pnpm: Internal Server Error - 500
```

Il log mostra che l'errore avviene durante `pnpm install --frozen-lockfile`, mentre il runner tenta di installare `pnpm@10.17.1`
come tool di sistema (es. `/vercel/.local/share/pnpm/.tools/pnpm/10.17.1_tmp_*`). È una condizione esterna (registry npm /
connessione) e non dipende dal contenuto del branch.

## Cosa fare
- Non servono cambi nel codice o nei workflow per questo ramo.
- Quando il registry npm torna stabile, basta:
  - cliccare “Redeploy” per il deployment fallito in Vercel, oppure
  - rilanciare il deploy da `main` dopo il merge.
