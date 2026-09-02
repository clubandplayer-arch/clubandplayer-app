# FASE 4D — English

## Stato

**COMPLETATA / PASS — smoke Preview confermato dall'utente; baseline inglese e recheck responsive francese approvati.**

La baseline inglese usa la stessa infrastruttura e le stesse chiavi certificate nelle FASI 4B–4C. Questa sottofase verifica le superfici prioritarie Web e corregge la regressione responsive cross-locale segnalata sul CTA francese `Détails de l’annonce`. Non modifica database, API, RLS o Mobile.

## Correzione responsive cross-locale

Nella tabella desktop `/applications` il CTA era un elemento inline la cui larghezza poteva essere compressa dalla colonna. La traduzione francese, più lunga, veniva spezzata su due righe e il bordo appariva frammentato.

La correzione:

- rende il link un contenitore `inline-flex`;
- usa una larghezza minima basata sul contenuto;
- impedisce il wrapping interno del testo;
- mantiene la tabella dentro un contenitore con overflow orizzontale;
- mantiene il CTA mobile a larghezza piena come singola unità;
- localizza anche le intestazioni `Data` e `Azione`, che nello screenshot francese restavano italiane.

La regola è indipendente dalla lingua e quindi protegge anche traduzioni future più lunghe.

## Baseline inglese verificata

### Navigazione e infrastruttura

- `English` resta una lingua attiva e selezionabile.
- Il catalogo inglese mantiene parità completa con la sorgente italiana.
- Il locale UI controlla le date visibili nelle superfici consolidate.
- Il fallback finale resta italiano fino alla certificazione 4I.

### Rete

Sono esplicitamente verificate le label:

- `Your network`;
- `Suggested`;
- `Following`;
- `Followers`;
- `View profile`;
- caricamenti, stati vuoti ed errori del Network.

### Candidature

Sono esplicitamente verificate:

- `My applications`;
- descrizione Player/Club;
- `Status`, `Date`, `Actions`;
- stati controllati;
- `Listing details` come CTA;
- empty state, apertura e ritiro candidatura;
- date formattate secondo il locale inglese.

### Opportunity e località

- Il dettaglio Opportunity usa `Loading`, `Opportunity not found`, `Age` e la navigazione inglese dal catalogo.
- `/profile/location-settings` usa titolo e istruzioni inglesi preservando URL ed endpoint tecnici.

## Terminologia inglese baseline

- Il marchio `Club and Player` non viene tradotto.
- Gli account type restano `Club`, `Player`, `Staff`, `Fan`, `Institution`.
- Il dominio generale è `Opportunity`; `listing` è ammesso per CTA o singolo annuncio pubblicato.
- `Application` identifica la candidatura, non `request` o `question`.
- `Country` identifica il Paese; residence, interests e relocation restano concetti distinti.
- L'inglese UI usa la baseline `en-GB` per `Intl`, senza cambiare valori persistiti.

## Compatibilità

- Nessuna migration o query remota.
- Nessuna modifica a endpoint, payload, route, autenticazione o permessi.
- Nessuna chiave eliminata o rinominata.
- Nessuna modifica al comportamento di candidatura.
- Nessuna modifica Mobile; parity rinviata alla FASE 9G.

## Verifica manuale Preview richiesta

Usare lingua **English** con un account Player; eseguire i punti 1–3 anche riducendo il viewport alla larghezza mostrata nello screenshot francese:

1. `/applications`: verificare `My applications`, descrizione, filtro, `Opportunity / Club / Status / Date / Actions` e CTA `Listing details` su una sola riga con bordo continuo.
2. Passare a Français senza cambiare viewport: `Détails de l’annonce` deve restare su una sola riga, con bordo continuo e senza sovrapporsi alla sidebar; è accettabile lo scroll orizzontale interno alla tabella su viewport stretti.
3. Viewport mobile: le card devono mostrare CTA a larghezza piena, testo centrato e nessun overflow laterale della pagina.
4. `/network`: verificare titolo, descrizione, tab, filtri, CTA, loading/empty state e assenza di copy italiano.
5. Dettaglio Opportunity: verificare back link, age, data inglese e not-found.
6. `/profile/location-settings`: verificare copy inglese e funzionamento dei tre link.
7. Cambiare English → Italiano → English e ricaricare: il catalogo deve restare coerente.
8. DevTools Console/Network: nessun errore hydration, nessun loop di richieste e nessuna risposta 500 causata da queste interazioni.

## Criterio di chiusura

La FASE 4D è **COMPLETATA / PASS** dopo la conferma dello smoke inglese e del recheck responsive francese. La FASE 4E è stata autorizzata esplicitamente.
