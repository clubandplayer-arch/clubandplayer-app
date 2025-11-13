# Repository audit – 9 marzo 2025

Questa analisi riepiloga lo stato attuale del branch `work`, evidenziando le cartelle indispensabili per la MVP di **Club & Player** e ciò che è stato rimosso perché ridondante. L'obiettivo è arrivare rapidamente a un perimetro pulito, mantenendo solo ciò che serve per sviluppare e validare le funzionalità core (autenticazione, profili, feed, opportunità, messaggistica e area admin).

## Sintesi

- Ho rimosso i file temporanei `build.log`, `conflicts.txt` e `struttura.txt`, non funzionali al prodotto.
- Ho esteso `.gitignore` per evitare che log generati localmente ricompaiano nelle prossime commit.
- README aggiornato con requisiti, variabili e checklist MVP; roadmap allineata allo stato attuale.
- Workflow GitHub Actions `E2E (non-blocking)` aggiornato: usa il runner Node, carica l'artifact `e2e-smoke-log` e può diventare bloccante impostando `SMOKE_ENFORCE=true`.

## Stato delle principali directory

| Percorso | Stato | Contenuto/ruolo principale | Note operative |
| --- | --- | --- | --- |
| `app/` | Core | Route Next.js (autenticazione, onboarding, feed, profili, admin, API route). | Verificare che le sottocartelle legacy (`c/[id]`, `u/[id]`) siano collegate a nuove rotte; in caso contrario andranno dismesse dopo i test di regressione. |
| `components/` | Core | Libreria UI condivisa (layout, feed, club, auth, moduli, shell). | Da mantenere. Prevedere cleanup successivo dei componenti non referenziati (richiede code search mirato). |
| `hooks/` | Core | Hook React per supabase/auth, preferenze utente e UI. | Nessuna azione immediata. |
| `lib/` | Core | Helper per Supabase, validazioni, API layer, feature flags. | Priorità: sostituire mock residui in `lib/data`. |
| `types/` | Core | Tipi condivisi per profili, club, opportunità. | Allineare con schema Supabase quando completata la MVP. |
| `supabase/` | Core | Migrazioni SQL e politiche RLS. | Tenere sincronizzato con l'istanza gestita. |
| `scripts/` | Supporto | Script ausiliario (`create-admin-user.mjs`). | Mantenere per bootstrap ambienti. |
| `data/` | Supporto | Costanti (geo, ruoli). | Convertire in seed Supabase quando pronte API dinamiche. |
| `public/` | Supporto | Asset statici (icone). | Ok. |
| `docs/` | Documentazione | Report, checklist MVP, audit corrente. | Aggiornare `docs/mvp-next-steps.md` al termine di ogni milestone. |
| `tests/` | Supporto | Smoke test Node (`pnpm test:e2e`) + harness Next.js. | Valutare reintroduzione Playwright solo se servono scenari completi. |
| `.github/` | Supporto | Workflow CI (Next.js, lint, e2e). | Verificare che i workflow puntino a PNPM 10. |
| `.vscode/` | Supporto | Settings consigliati per il team. | Nessuna azione. |
| `node_modules/` | Ambiente | Installazione dipendenze (non tracciata da git). | Assicurarsi che rimanga esclusa dal repository. |

## Elementi rimossi

| File | Motivo rimozione |
| --- | --- |
| `build.log` | Log di build locale, già riproducibile da CI. |
| `conflicts.txt` | Segnaposto vuoto derivato da merge tool. |
| `struttura.txt` | Output di `tree`/inventario non aggiornato, duplicato delle informazioni fornite qui. |

## Suggerimenti per il post-MVP

1. **Pulizia codice dead:** eseguire un controllo degli import con `pnpm lint -- --report-unused-disable-directives` per isolare componenti non utilizzati.
2. **Mock vs dati reali:** consolidare le query Supabase e rimuovere progressivamente i fallback in `lib/data` e `components/**/mock.ts` (dove presenti).
3. **Test di regressione:** valutare il ripristino di una suite Playwright completa quando riprenderà lo sviluppo oltre l'MVP.
4. **Documentazione deploy:** sincronizzare README e roadmap dopo ogni rilascio per mantenere un'unica fonte di verità.

Questa fotografia rappresenta il punto di partenza per rifinire la MVP. Aggiorna il file quando completi un blocco di attività significativo, così il team mantiene una visione condivisa della base codice.
