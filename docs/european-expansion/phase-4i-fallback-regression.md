# FASE 4I — Fallback e regressione

## Stato

**IMPLEMENTATA — test automatici PASS; SMOKE FINALE PREVIEW RICHIESTO prima di chiudere la FASE 4.**

## Correzioni dell'ultimo smoke

- Il selettore geografico usa label i18n invece dei default italiani.
- I nomi dei Paesi sono presentati tramite `Intl.DisplayNames` nel locale UI, preservando ID e ISO2.
- MyMedia localizza back link, tab, titoli, empty state, istruzioni e pulsanti di condivisione.
- Il link `Vedi tutti` del widget media nel Feed usa il catalogo.

Titoli e descrizioni degli annunci nella sidebar restano contenuti utente e non vengono tradotti automaticamente.

## Gate di fallback e regressione

- Tutte le lingue attive mantengono parità completa delle chiavi rispetto all'italiano.
- I placeholder di interpolazione (`{count}`, `{max}`, `{date}`, ecc.) devono essere identici in ogni catalogo.
- Una chiave assente nel locale richiesto usa il catalogo italiano.
- Una chiave assente anche nel fallback restituisce la chiave, senza crash.
- Il locale non supportato continua a risolversi sull'italiano.
- Sport, ruoli, genere e categorie sconosciuti restano invariati invece di ricevere traduzioni inventate.
- Nessun valore persistito viene tradotto o migrato.

## Compatibilità

- Nessuna migration o modifica RLS.
- Nessuna modifica API, payload o route.
- Nessuna modifica ai contenuti utente.
- Nessuna modifica Mobile.

## Smoke finale richiesto

1. In FR aprire `/opportunities`: `Pays`, `Sélectionner un pays`, `Italie`, `France`, `Espagne`, `Suisse`, `Slovénie`, `Pologne` devono essere coerenti.
2. Ripetere in ES e EN verificando `País/Selecciona un país` e `Country/Select a country` con nomi localizzati.
3. Aprire MyMedia foto e video in FR, EN ed ES: back link, tab, titoli, empty state, istruzioni e share devono essere tradotti.
4. Nel Feed verificare `Voir tout`, `View all` e `Ver todo` nel widget media.
5. Cambiare lingua, ricaricare e navigare tra le superfici: nessuna chiave grezza e nessun flash permanente in italiano.
6. Verificare metadata della 4H e i flussi lingua della 4G una volta ancora.
7. Console/Network: nessun errore hydration, loop, richiesta incontrollata o risposta 500.

## Chiusura e branch

Dopo il PASS manuale, la FASE 4 può essere chiusa. Prima di ulteriore sviluppo deve essere presa una decisione esplicita e separata tra merge controllato e nuovo branch derivato dall'attuale branch pesante; questa candidate non effettua nessuna delle due operazioni.
