# FASE 4C — Baseline italiana

## Stato

**IMPLEMENTATA — test automatici PASS; VERIFICA VISIVA/MANUALE PREVIEW RICHIESTA prima della chiusura.**

La baseline italiana è stata consolidata sulle superfici operative prioritarie emerse dall'audit 4A: rete, candidature, dettaglio Opportunity e pagina legacy delle impostazioni geografiche. La fase non viene marcata completata finché lo smoke italiano indicato sotto non viene confermato.

## Obiettivi

- Rendere il catalogo italiano la sorgente del copy, non una raccolta parallela a stringhe JSX.
- Conservare il testo italiano e il comportamento esistenti senza cambiare API o dati.
- Evitare che le successive review EN/FR/ES lascino parti delle superfici prioritarie in italiano.
- Usare il locale UI per le date visibili, senza modificare le normalizzazioni italiane dei dati legacy.
- Aggiungere un gate automatico contro la reintroduzione delle principali stringhe hardcoded migrate.

## Superfici consolidate

### Rete

`NetworkPage` usa ora chiavi per:

- titolo e descrizione;
- tab Suggeriti/Segui/Seguaci;
- filtri;
- CTA profilo;
- stati vuoti e caricamenti;
- fallback dei nomi profilo;
- errori di caricamento.

Le funzioni di caricamento sono stabilizzate con `useCallback`, così il cambio catalogo aggiorna i messaggi senza introdurre warning hook o richieste cicliche.

### Candidature

Le viste inviate/ricevute usano ora il catalogo per:

- introduzione per Club, Player e guest;
- filtri e indicazione della vista;
- stato vuoto;
- data, Player e nota;
- apertura annuncio;
- ritiro e conferma;
- status della candidatura;
- vincolo Player/Staff;
- errori UI di fallback.

Le date della lista e del dettaglio usano il locale UI attivo.

### Opportunity

Il dettaglio client usa il catalogo per caricamento, not-found, errore di fallback, navigazione indietro ed età. Non sono state modificate query, ownership, candidatura o payload.

### Impostazioni località legacy

La pagina informativa `/profile/location-settings` usa il catalogo per titolo e istruzioni, preservando i link e l'endpoint indicato. Non introduce nuove write geografiche.

## Terminologia italiana baseline

- Marchio e account type restano `Club`, `Player`, `Staff`, `Fan` ed `Ente` dove già adottati dal prodotto.
- `Opportunity` identifica il dominio; nel copy contestuale è ammesso `annuncio` quando indica la singola pubblicazione.
- `Candidatura` indica l'application dell'utente; `domanda` non viene usato come sinonimo nella baseline consolidata.
- `Paese` è preferito per il concetto geografico; testi legacy che usano `Nazione` saranno trattati per superficie senza alterare valori persistiti.
- Residence, zona di interesse e relocation restano concetti distinti.

## Compatibilità e rischio

- Nessuna migration o write remota.
- Nessuna modifica a endpoint, schema, RLS, route o autenticazione.
- Nessuna chiave esistente rimossa o rinominata.
- Le nuove chiavi sono presenti in tutti e quattro i cataloghi per mantenere la parità strutturale; 4D–4F ne certificheranno la qualità linguistica.
- Il copy italiano visibile resta semanticamente equivalente al precedente.
- Nessuna modifica Mobile; parity rinviata alla FASE 9G.

## Gate automatici

- parità completa delle chiavi IT/EN/FR/ES;
- fallback e interpolazione;
- assenza delle principali stringhe JSX migrate nelle superfici 4C;
- TypeScript, ESLint e suite unit completa.

## Verifica manuale Preview richiesta

Eseguire lo smoke con lingua **Italiano** e viewport desktop; ripetere almeno i punti 1–3 su viewport mobile:

1. `/network`: verificare titolo, descrizione, tre tab, filtri, caricamento/stato vuoto e CTA `Visita profilo`.
2. `/applications` con account Club: verificare testo introduttivo, filtro stati, dicitura vista, tabella/card mobile e pulsanti candidatura.
3. `/applications` con account Player: verificare stato vuoto oppure elenco, stato, data localizzata, apertura annuncio e conferma di ritiro.
4. Aprire un dettaglio Opportunity: verificare caricamento, ritorno alle opportunità, età e data in formato italiano; usare un ID inesistente e verificare il messaggio not-found.
5. `/profile/location-settings`: verificare titolo, istruzioni, link `/settings`, `/player/profile`, `/club/profile` e testo endpoint.
6. Cambiare temporaneamente lingua e tornare a Italiano: verificare che nessuna delle superfici sopra conservi copy della lingua precedente.
7. DevTools Console e Network: nessun errore React/hydration, nessun loop di richieste e nessuna risposta 500 generata dalla navigazione.

## Criterio di chiusura

La FASE 4C può essere marcata **COMPLETATA / PASS** dopo conferma dello smoke Preview italiano. Fino ad allora la FASE 4D non è autorizzata implicitamente.
