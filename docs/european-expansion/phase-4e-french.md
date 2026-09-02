# FASE 4E — Français

## Stato

**IMPLEMENTATA — test automatici PASS; VERIFICA VISIVA/MANUALE PREVIEW RICHIESTA prima della chiusura.**

La baseline francese consolida il catalogo Web già completo nelle chiavi e applica una revisione editoriale alle superfici prioritarie certificate nelle FASI 4C–4D. Non modifica database, API, route, valori persistiti o applicazione Mobile.

## Baseline verificata

- Il catalogo `fr` mantiene parità completa con la sorgente italiana.
- Rete, Candidature, Opportunity, ricerca, profilo e feed usano chiavi i18n, non copy francese hardcoded nei componenti.
- Le date visibili continuano a usare il locale UI francese.
- Il fallback finale resta italiano fino alla FASE 4I.
- Il CTA `Détails de l’annonce` mantiene la protezione responsive approvata nello smoke 4D.

## Revisione editoriale

La revisione elimina formulazioni artificiali o residue:

- `Joueurs et Staff uniquement` sostituisce la forma con slash;
- `Rôle ou poste` sostituisce `Rôle/poste`;
- `Nom du Club ou de l’équipe` rende esplicita l'alternativa;
- `opportunités` non conserva una maiuscola italiana impropria nel testo corrente;
- l'esempio locale di ricerca usa `Paris`, non `Rome`;
- `Gérer ou voir toutes les opportunités` sostituisce la forma con slash;
- `Informations sur la version bêta` chiarisce l'etichetta informativa.

Le parole condivise tra francese e inglese (`Club`, `Staff`, `Sport`, `Date`, `Actions`, `Messages`, `Notifications`) non sono fallback accidentali: sono termini francesi validi o vocabolario di prodotto deliberatamente condiviso.

## Terminologia francese baseline

- `Opportunité` indica il dominio generale; `annonce` è ammesso per la singola pubblicazione e i relativi CTA.
- `Candidature` indica l'application sportiva.
- `Joueur`, `Supporter`, `Abonné` e `Effectif` restano i termini approvati per account e rete.
- `Pays`, `Région`, `Province`, `Ville` e `Zone d’intérêt` restano distinti.
- Il marchio `Club and Player` e gli account type tecnici `Club` e `Staff` non vengono tradotti.

## Compatibilità

- Nessuna migration, query o modifica RLS.
- Nessuna modifica a endpoint o payload.
- Nessuna chiave rinominata, aggiunta o eliminata.
- Nessuna modifica a candidatura, ricerca o ranking.
- Nessuna modifica Mobile; la parity resta rinviata alla repository Mobile.

## Verifica manuale Preview richiesta

Usare lingua **Français** con un account Player e verificare:

1. `/applications`: titolo, descrizione, filtro, intestazioni e stati sono francesi; `Détails de l’annonce` resta su una sola riga a desktop e mobile.
2. Ridurre il viewport alla larghezza dello screenshot originale: nessuna sovrapposizione con la sidebar e nessun overflow dell'intera pagina; lo scroll interno della tabella è ammesso.
3. `/network`: titolo, tab, filtri, stati vuoti e CTA sono francesi.
4. `/opportunities` e un dettaglio Opportunity: filtri, ruolo/poste, età, località, CTA e not-found sono francesi.
5. Ricerca: il placeholder di esempio mostra `Paris`; verificare loading, empty state e categorie.
6. Feed: verificare `Gérer ou voir toutes les opportunités` e le principali azioni di pubblicazione/commento.
7. `/profile/location-settings`: verificare titolo, istruzioni e funzionamento dei link.
8. Cambiare Français → English → Français e ricaricare: nessun copy italiano o catalogo misto.
9. DevTools Console/Network: nessun errore hydration, loop di richieste o risposta 500.

## Criterio di chiusura

La FASE 4E può essere marcata **COMPLETATA / PASS** dopo conferma dello smoke francese. Fino ad allora la FASE 4F non è autorizzata implicitamente.
