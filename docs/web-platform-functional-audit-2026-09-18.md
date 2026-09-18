# Audit funzionale completo Web — 18 settembre 2026

## Perimetro verificato

L'audit ha seguito i flussi applicativi e i relativi confini API/database per:

- registrazione email e OAuth, callback, login e recupero password;
- scelta ruolo e completamento di Club, Player, Staff, Fan, Ente e Admin;
- middleware, route protette e redirect;
- pubblicazione e apertura dei profili pubblici;
- feed, post, commenti, repost e collegamenti agli autori;
- ricerca globale, ricerca Club/Player/Staff, mappe e suggerimenti;
- opportunità, geografia canonica, iscrizioni Club e candidature;
- amministrazione utenti e qualità profili;
- build, typecheck, lint, test unitari, integration ed end-to-end disponibili.

## Problemi bloccanti accertati

### 1. Onboarding Club aggirabile

I redirect speciali di login/signup e scelta ruolo precedevano il controllo generale di completezza. Un account con ruolo già assegnato poteva quindi raggiungere `/feed` anche se il profilo era incompleto.

**Correzione:** ogni redirect iniziale usa ora `profile.is_complete` e `completion_path`.

### 2. Tre contratti diversi di completezza

Il form, `whoami` e il trigger database non leggevano le stesse fonti. Il modello corrente usa:

- `profiles` per identità e stato;
- `profile_preferences` per la geografia canonica;
- `club_sport_registrations` per sport, federazione/categoria e iscrizione attiva.

Il trigger storico controllava invece `profiles.sport` e località legacy. Questo lasciava in bozza Club completi e poteva considerare completi Club privi di iscrizione.

**Correzione:** il contratto Club richiede nome valido, geografia completa e almeno un'iscrizione attiva, sia nell'applicazione sia nel database. Le modifiche alle tabelle relazionali rivalutano automaticamente la pubblicazione.

### 3. Contenuti visibili con autore non apribile

Post e commenti erano leggibili anche quando il profilo dell'autore era `draft`. Il risultato era un contenuto visibile con una pagina autore deliberatamente non pubblica. In alcuni fallback l'ID auth veniva inoltre trattato come ID profilo.

**Correzione:** feed e commenti mostrano soltanto autori attivi/pubblicati (con eccezione esplicita per Platform Admin); la creazione di post e commenti è rifiutata finché il profilo non è pubblicato; il dettaglio post in bozza è disponibile solo al proprietario; gli URL pubblici richiedono sempre un vero `profiles.id`.

### 4. Opportunità creabili da un Club non pubblicato

La validazione verificava ruolo, geografia e iscrizione, ma non lo stato pubblico del profilo. Un client diretto poteva quindi creare un annuncio per un Club ancora in bozza.

**Correzione:** POST opportunità richiede anche `status=active` e `profile_visibility_status=published`.

### 5. Vista amministrativa fuorviante

La pagina utenti si apriva su `pending`, mentre le nuove registrazioni vengono auto-attivate. Gli account corretti risultavano quindi assenti dalla vista iniziale.

**Correzione:** la pagina e l'API amministrativa usano `all` come filtro predefinito.

## Matrice dei ruoli dopo la correzione

| Ruolo | Destinazione dopo scelta | Requisito prima del resto del sito |
| --- | --- | --- |
| Club | `/club/profile` | nome Club, geografia completa, iscrizione attiva |
| Player | `/player/profile` | nome, anno, nazionalità, sport e ruolo |
| Staff | `/staff/profile` | nome, anno, nazionalità, sport e ruolo Staff |
| Fan | `/fan/profile` | nome pubblico valido |
| Ente | `/institution/verification` | verifica documentale; profilo gestito dal percorso Ente |
| Admin | `/admin/profile` / feed | riconoscimento server-side dell'account amministratore |

## Search e profili pubblici

La ricerca globale applica lo scope centrale `active + published` ai profili. I Club usano la pubblicazione relazionale database e non vengono più rivalutati con un helper sincrono incapace di vedere iscrizioni e geografia canonica. Le mappe mantengono lo stesso confine e continuano a richiedere coordinate pubbliche valide.

## Opportunities

La creazione richiede ora, in sequenza:

1. account Club;
2. profilo Club attivo e pubblicato;
3. geografia canonica del Club;
4. iscrizione attiva e coerente con sport/organizzazione/categoria;
5. geografia dell'opportunità contenuta nell'area del Club;
6. contesto sportivo e ruolo canonici coerenti.

## Verifiche automatiche e limite ambientale

Sono stati eseguiti lint, typecheck, unit test, integration test ed end-to-end test. La build arriva alla compilazione Next.js ma nell'ambiente corrente non può scaricare `Inter` e `Righteous` da Google Fonts; questo è un limite di rete della build, non un errore TypeScript o applicativo.

## Operazioni obbligatorie di rilascio

1. Applicare `20261217120000_align_club_onboarding_publication.sql` prima o insieme al deploy Web.
2. Verificare che la migrazione rivaluti il Club segnalato da `draft` a `published` se possiede davvero nome valido, geografia e iscrizione attiva.
3. Eseguire lo smoke test con un nuovo account per ciascun ruolo.
4. Con un secondo account, verificare ricerca, apertura profilo, post, commento e opportunità del Club appena pubblicato.
5. Controllare i log per `club_profile_must_be_published` e per eventuali profili storici che non soddisfano ancora il contratto.
