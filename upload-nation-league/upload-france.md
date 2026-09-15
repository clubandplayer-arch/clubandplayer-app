# Club and Player — Catalogo Francia e integrazione nelle Iscrizioni

## Incarico per Codex

Leggi integralmente questo file e implementa nel repository web di Club and Player il catalogo Francia descritto qui, riutilizzando il modello delle Iscrizioni concordato per l’Italia. Questo documento contiene sia le istruzioni sia tutti i dati necessari: non richiedere l’Excel originale e non chiedere al product owner di ricomporre altri documenti.

Il product owner ha scelto `Campionati_Dilettantistici_Francia.xlsx` come perimetro dei contenuti francesi e ha approvato l’adattamento alle regole italiane: menu dipendenti dal Paese, enti con label brevi, voce unica Giovanili, iscrizioni multiple e una principale. Il catalogo normalizzato nella sezione 5 è la specifica applicativa di questa tranche. Le appendici conservano i dati originali per rendere verificabili le trasformazioni.

Questa è un’istruzione di implementazione nel repository, non una dichiarazione che le funzionalità siano già presenti o che i dati siano già importati nel database.

## 1. Perimetro e modalità di lavoro

- Individua repository, branch, stato Git e istruzioni applicabili. Lavora nel repository web `clubandplayer-app`. Se il checkout è quello mobile, segnala il mismatch prima di modificare file applicativi: questo documento non autorizza una prima implementazione autonoma nel mobile.
- Controlla l’implementazione italiana effettiva, lo schema dei cataloghi, le API, le Iscrizioni del Club, il profilo pubblico e le Opportunity. Riusa i componenti e le convenzioni già presenti.
- Se il modello delle iscrizioni multiple non è presente, descrivi il requisito mancante. Puoi preparare il catalogo Francia secondo le convenzioni esistenti, ma non dichiarare conclusa l’integrazione e non creare un modello parallelo con una sola affiliazione nel profilo.
- Implementa le modifiche locali, i dati e i test pertinenti senza chiedere conferma per le normali scelte tecniche.
- Non fare ricerche estese né ampliare il catalogo ad altri campionati. Usa i dati autorizzati in questo file. Non escludere opzioni perché territoriali, generiche, promozionali, amatoriali, giovanili, professionistiche o riferite a tornei/coppe.
- Non accedere a Supabase remoto, non applicare migration remote e non intervenire su Vercel o sugli store. La pubblicazione in Production non è autorizzata da questo incarico.
- Non modificare migration già applicate. Per l’estensione usa una nuova migration conforme alla sequenza del repository, o il meccanismo di catalogo già adottato. Non inventare lo stato delle migration remote.
- Non fare reset, amend di commit precedenti, force push, push o merge. Lascia le modifiche locali e il riepilogo per la revisione, salvo istruzioni esplicite successive dell’utente.
- Non modificare Player, Staff, Fan, Institution o le esperienze. Il mobile resta una tranche successiva. Gli endpoint condivisi devono mantenere compatibilità con i client esistenti.

## 2. Paese e selettori

Il contesto francese è identificato dal codice Paese `FR`. Usa la fonte canonica del Paese già adottata dal prodotto per il catalogo e la geografia: non dedurlo dalla lingua dell’interfaccia, dalla cittadinanza dell’utente o da una stringa di città.

Nel contesto del Paese selezionato, conserva il modulo:

**Sport → Ente/Federazione → Categoria/Campionato**

- Riusa il selettore/contesto Paese esistente. Non introdurre un secondo Paese ridondante nel modulo iscrizioni se il contesto è già determinato.
- Rendi il catalogo country-aware nel livello condiviso usato dai selettori, seguendo i nomi di parametri e gli endpoint del repository.
- Francia mostra soltanto gli enti e le categorie francesi compatibili con lo sport scelto. Italia conserva dati, label, ordinamento e comportamento attuali.
- Mostra soltanto enti con almeno una categoria autorizzata nella combinazione Paese + Sport.
- Filtra le categorie per la combinazione esatta Paese + Sport + Ente, includendo disciplina/variante dove richieste dal modello canonico.
- Cambiando Paese, Sport o Ente, azzera i valori dipendenti diventati incompatibili nel modulo in modifica. Non cancellare né convertire iscrizioni già salvate come effetto collaterale.
- Valida anche lato server la coerenza del Paese. Il Paese può essere ricavato da relazioni canoniche esistenti: non aggiungere colonne duplicate senza necessità.
- Mantieni i fallback previsti per i client che non inviano un nuovo parametro Paese. Nessun default deve mostrare dati italiani quando l’utente ha selezionato esplicitamente Francia.

## 3. Regole condivise con l’Italia

### Sport e nomi

- Conserva tutti gli sport già presenti nel prodotto, anche se privi di categorie in questa tranche.
- `Volley` nell’Excel corrisponde allo sport applicativo esistente Pallavolo/Volley. `Basket` corrisponde a Pallacanestro/Basket. Questi sono alias, non nuovi sport da creare.
- Calcio, Calcio a 8 e Futsal restano scelte applicative distinte. Collega correttamente sport, disciplina, variante e compatibilità legacy secondo il catalogo esistente; non accorpare i tre selettori sotto un unico valore Football.
- Le righe Baseball e Softball sono distribuite sui due sport già previsti dal prodotto. Non creare uno sport aggiuntivo denominato `Baseball e Softball`.
- Le denominazioni degli sport si traducono usando l’i18n esistente. Le denominazioni proprie dei campionati restano francesi.

### Giovanili

- Una sola categoria Giovanili per Paese + Sport applicativo + Ente quando l’attività giovanile è esplicitamente presente nei dati.
- In questa tranche la sostituzione riguarda Calcio + FFF e Hockey su ghiaccio + FFHG.
- National U19, National U17 e National Féminin U19 confluiscono nella stessa voce Calcio + FFF + Giovanili.
- U20, U18 e U15 confluiscono nella stessa voce Hockey su ghiaccio + FFHG + Giovanili.
- Non mantenere anche le singole categorie Under nei menu e non creare una seconda voce Giovanili per il femminile.
- Usa la label `Giovanili` in italiano e `Jeunes` in francese tramite le convenzioni i18n del repository. Riusa eventuali traduzioni inglesi/spagnole esistenti.
- Non aggiungere Giovanili agli altri sport senza dati autorizzati. La sostituzione riguarda il nuovo catalogo, non la riscrittura di iscrizioni legacy.

### Categorie generiche e composte

- Le opzioni territoriali e generiche sono selezionabili a tutti gli effetti, come quelle già autorizzate per l’Italia.
- Sono state separate soltanto alternative esplicite: R1/R2/R3, Pré-Nationale/Régionale, Pré-Régionale/Départementale, Régional Futsal/District Futsal, Élite Masculine/Féminine e Baseball/Softball.
- `District 2 (D2) et niveaux inférieurs` resta una sola opzione generica. Non creare D3, D4, D5 o ulteriori livelli deducendoli dall’espressione “e inferiori”.
- `Pratique territoriale` per Calcio a 8 e `Compétition nationale féminine de futsal` sono label generiche autorizzate. Non presentarle nella documentazione come denominazioni ufficiali verificate di una competizione specifica.
- Per le righe che non specificano maschile/femminile, non duplicare automaticamente le categorie e non assegnare un genere per supposizione.
- Conserva tutte le categorie professionistiche incluse nel file. Il nome dell’Excel non autorizza a rimuoverle.

### Nessun nuovo campo nell’iscrizione

Non introdurre stagione, anno sportivo, edizione, girone, territorio o ranking nel modulo o nel modello delle iscrizioni per questo incarico. Le colonne Livello/Ambito, Natura e Note dell’Excel sono contesto documentale; non generano altri selettori, requisiti o classifiche.

## 4. Enti francesi e ordinamento

Le seguenti sono le label applicative francesi e l’ordine relativo da assegnare con `display_order` o equivalente. Mantieni l’ordine anche nei sottoinsiemi filtrati. I nomi completi restano nei dati interni.

| Ordine | Label | Nome completo dal file | Sport applicativi di questa tranche |
| --- | --- | --- | --- |
| 1 | FFF | Fédération Française de Football | Calcio, Calcio a 8, Futsal |
| 2 | FFvolley | Fédération Française de Volley | Pallavolo |
| 3 | FFBB | Fédération Française de BasketBall | Pallacanestro |
| 4 | FFHandball | Fédération Française de Handball | Pallamano |
| 5 | FFR | Fédération Française de Rugby | Rugby |
| 6 | FFHG | Fédération Française de Hockey sur Glace | Hockey su ghiaccio |
| 7 | FFN | Fédération Française de Natation | Pallanuoto |
| 8 | FFH | Fédération Française de Hockey | Hockey su prato |
| 9 | FFBS | Fédération Française de Baseball et Softball | Baseball, Softball |
| 10 | FFFA | Fédération Française de Football Américain | Football americano |
| 11 | France Lacrosse | Association Française de Lacrosse | Lacrosse |

Nel menu si sceglie la federazione indicata in questa tabella. I riferimenti del file a LFP, LNV, LNB, LNH, LFH, LNR, Ligues, Comités e Districts sono informazioni sull’organizzazione delle competizioni: non creare automaticamente altri enti selezionabili o ulteriori livelli obbligatori nel modulo.

La relazione categoria/federazione di questo catalogo rappresenta l’affiliazione applicativa; non afferma che ogni competizione sia organizzata direttamente dalla federazione nazionale.

L’ordine italiano resta esattamente: LND, Lega Calcio a 8, E.I.F.A., CSI, UISP, CSEN, AICS, OPES, ASC, ENDAS, PGS, US ACLI. Non applicare tale elenco come whitelist globale che impedisca gli enti francesi.

## 5. Catalogo Francia da implementare

Ogni riga delle tabelle seguenti è una categoria selezionabile nella combinazione `FR + Sport + Ente`. L’ordine nella tabella è l’ordine di visualizzazione nello specifico gruppo, non un ranking sportivo. I numeri di origine si riferiscono al foglio `Campionati e Categorie` dell’Excel.

`Generica/territoriale` è soltanto una nota per chi implementa; non aggiungere badge o stati di blocco nell’interfaccia. `Giovanili` segue la traduzione indicata sopra.

### Aggiornamento circoscritto del nome National

La riga 5 originale contiene `National`. Per la nuova opzione corrente usa `Ligue 3`, con `National` conservato come denominazione storica/alias nella documentazione o nel meccanismo alias già disponibile. La verifica mirata svolta durante la preparazione ha rilevato la denominazione `Ligue 3 Betclic` sul sito FFF per il 2026/27: https://www.fff.fr/ . La label applicativa omette lo sponsor. Non creare due categorie correnti distinte e non riscrivere automaticamente dati storici.

Questa verifica riguarda soltanto tale denominazione: non certifica l’attualità di ogni nota su formule, gironi, natura o livelli dell’Excel. Le altre label restano quelle fornite, salvo le normalizzazioni esplicite qui documentate.

### Calcio — FFF

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Ligue 3 | 5 | Alias storico: National |
| 2 | National 2 | 6 | — |
| 3 | National 3 | 7 | — |
| 4 | Régional 1 (R1) | 8 | — |
| 5 | Régional 2 (R2) | 9 | — |
| 6 | Régional 3 (R3) | 10 | — |
| 7 | District 1 (D1) | 11 | — |
| 8 | District 2 (D2) et niveaux inférieurs | 12 | Generica/territoriale |
| 9 | Arkema Première Ligue | 13 | — |
| 10 | Seconde Ligue | 14 | — |
| 11 | Giovanili | 15, 16, 17 | Voce unica Giovanili |

### Calcio a 8 — FFF

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Pratique territoriale | 18 | Generica/territoriale |

### Futsal — FFF

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | D1 Futsal | 19 | — |
| 2 | D2 Futsal | 20 | — |
| 3 | Compétition nationale féminine de futsal | 21 | Generica/territoriale |
| 4 | Régional Futsal | 22 | Generica/territoriale |
| 5 | District Futsal | 22 | Generica/territoriale |

### Pallavolo — FFvolley

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Marmara SpikeLigue | 23 | — |
| 2 | Saforelle Power 6 | 24 | — |
| 3 | Ligue B Masculine | 25 | — |
| 4 | Élite Masculine | 26 | — |
| 5 | Élite Féminine | 27 | — |
| 6 | Nationale 2 Masculine | 28 | — |
| 7 | Nationale 2 Féminine | 29 | — |
| 8 | Nationale 3 Masculine | 30 | — |
| 9 | Nationale 3 Féminine | 31 | — |
| 10 | Pré-Nationale | 32 | Generica/territoriale |
| 11 | Régionale | 32 | Generica/territoriale |
| 12 | Départementale | 33 | Generica/territoriale |

### Pallacanestro — FFBB

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Betclic ÉLITE | 34 | — |
| 2 | ÉLITE 2 (Pro B) | 35 | — |
| 3 | Nationale Masculine 1 (NM1) | 36 | — |
| 4 | Nationale Masculine 2 (NM2) | 37 | — |
| 5 | Nationale Masculine 3 (NM3) | 38 | — |
| 6 | La Boulangère Wonderligue | 39 | — |
| 7 | Ligue Féminine 2 (LF2) | 40 | — |
| 8 | Nationale Féminine 1 (NF1) | 41 | — |
| 9 | Nationale Féminine 2 (NF2) | 42 | — |
| 10 | Nationale Féminine 3 (NF3) | 43 | — |
| 11 | Régionale 1 | 44 | Generica/territoriale |
| 12 | Régionale 2 | 44 | Generica/territoriale |
| 13 | Régionale 3 | 44 | Generica/territoriale |
| 14 | Pré-Régionale | 45 | Generica/territoriale |
| 15 | Départementale | 45 | Generica/territoriale |

### Pallamano — FFHandball

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Liqui Moly StarLigue | 46 | — |
| 2 | ProLigue | 47 | — |
| 3 | D1F (Ligue Butagaz Énergie) | 48 | — |
| 4 | D2F | 49 | — |
| 5 | Nationale 1 Masculine (N1M) | 50 | — |
| 6 | Nationale 2 Masculine (N2M) | 51 | — |
| 7 | Nationale 3 Masculine (N3M) | 52 | — |
| 8 | Nationale 1 Féminine (N1F) | 53 | — |
| 9 | Nationale 2 Féminine (N2F) | 54 | — |
| 10 | Nationale 3 Féminine (N3F) | 55 | — |
| 11 | Prénationale | 56 | Generica/territoriale |
| 12 | Régionale | 56 | Generica/territoriale |
| 13 | Départementale | 57 | Generica/territoriale |

### Rugby — FFR

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Top 14 | 58 | — |
| 2 | Pro D2 | 59 | — |
| 3 | Nationale | 60 | — |
| 4 | Nationale 2 | 61 | — |
| 5 | Fédérale 1 | 62 | — |
| 6 | Fédérale 2 | 63 | — |
| 7 | Fédérale 3 | 64 | — |
| 8 | Élite 1 Féminine | 65 | — |
| 9 | Élite 2 Féminine | 66 | — |
| 10 | Fédérale 1 Féminine | 67 | — |
| 11 | Fédérale 2 Féminine | 68 | — |
| 12 | Régionale 1 | 69 | — |
| 13 | Régionale 2 | 70 | — |
| 14 | Régionale 3 | 71 | — |

### Hockey su ghiaccio — FFHG

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Synerglace Ligue Magnus | 72 | — |
| 2 | Division 1 | 73 | — |
| 3 | Division 2 | 74 | — |
| 4 | Division 3 | 75 | — |
| 5 | Championnat Féminin | 76 | Generica/territoriale |
| 6 | Giovanili | 77, 78, 79 | Voce unica Giovanili |

### Pallanuoto — FFN

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Élite Masculine | 80 | — |
| 2 | Élite Féminine | 80 | — |
| 3 | Nationale 1 | 81 | — |
| 4 | Nationale 2 | 82 | — |
| 5 | Nationale 3 | 83 | Generica/territoriale |
| 6 | Régionale | 83 | Generica/territoriale |

### Hockey su prato — FFH

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Elite Masculine | 84 | — |
| 2 | Elite Féminine | 84 | — |
| 3 | Nationale 1 | 85 | — |
| 4 | Nationale 2 | 86 | — |

### Baseball — FFBS

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Division 1 (Baseball) | 87 | — |
| 2 | Division 2 (Baseball) | 88 | — |
| 3 | Nationale 1 (Baseball) | 89 | — |
| 4 | Régionale | 91 | Generica/territoriale |

### Softball — FFBS

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Division 1 (Softball) | 90 | — |
| 2 | Régionale | 91 | Generica/territoriale |

### Football americano — FFFA

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Division 1 (Casque de Diamant) | 92 | — |
| 2 | Division 2 (Casque d'Or) | 93 | — |
| 3 | Division 3 (Casque d'Argent) | 94 | — |
| 4 | Régionale | 95 | Generica/territoriale |

### Lacrosse — France Lacrosse

| Ordine | Categoria/Campionato | Righe Excel | Nota |
| --- | --- | --- | --- |
| 1 | Championnat de France de Lacrosse | 96 | — |

## 6. Integrazione nelle Iscrizioni del Club

Riusa il modello italiano delle iscrizioni multiple, preferibilmente `club_sport_registrations` se questo è il nome effettivo nel repository. Non creare una tabella Francia separata e non tornare a una sola combinazione nel profilo.

Ogni iscrizione conserva i riferimenti canonici al Club, Sport, eventuale disciplina/variante, Ente e Categoria, oltre allo stato attivo e al flag principale già previsti.

- Un Club può avere più iscrizioni, anche nello stesso sport con categorie diverse.
- Non consentire duplicati della stessa combinazione completa per lo stesso Club secondo i vincoli esistenti.
- Categoria, Ente, Sport e Paese devono appartenere allo stesso contesto autorizzato.
- Una sola iscrizione attiva può essere principale. Il cambio deve essere atomico.
- Un Club può creare, modificare e disattivare soltanto le proprie iscrizioni; riusa autenticazione, RLS e privilegi minimi. Non usare `service_role` per aggirare i controlli.
- La lettura pubblica mostra solo le iscrizioni attive, principale per prima, poi ordine stabile.
- Mantieni il comportamento già concordato quando viene disattivata la principale: scelta esplicita o regola documentata, senza selezione arbitraria silenziosa.

### Modulo e profilo pubblico

In `/club/profile`, o nella route equivalente, riusa la sezione Iscrizioni con Aggiungi, Modifica, Disattiva e Imposta come principale.

Nel profilo pubblico, la principale alimenta testata e dati sportivi nel formato Sport · Ente/Federazione · Categoria. Tutte le iscrizioni attive restano visibili nella sezione Iscrizioni.

Esempio applicativo autorizzato per un Club nel contesto Francia:

- Calcio · FFF · Régional 1 (R1) — principale;
- Calcio · FFF · Giovanili;
- Futsal · FFF · D2 Futsal.

### Opportunity

Riusa la select Iscrizione del Club: mostra le iscrizioni attive del Club autenticato, preseleziona la principale e consenti una secondaria. Sport, Ente e Categoria derivano dalla scelta, senza richiedere una seconda compilazione della stessa combinazione.

Valida server-side la proprietà dell’iscrizione e conserva nell’Opportunity i riferimenti canonici secondo il modello italiano. Disattivare un’iscrizione non deve cancellare o corrompere Opportunity già pubblicate.

### Compatibilità

Mantieni i campi legacy, i fallback del profilo pubblico e le Opportunity legacy. Non effettuare backfill o conversioni automatiche, non cancellare valori italiani e non aggiornare in massa i profili. Un alias di nome non autorizza a sostituire UUID già referenziati.

## 7. Dati, identificatori e geografia

- Riusa Sport, discipline, varianti ed enti già presenti quando corrispondono allo stesso contesto canonico. Non generare duplicati perché una label differisce per lingua, maiuscole o abbreviazione.
- Assegna identificatori stabili alle nuove categorie secondo le convenzioni del repository. Non usare come unica chiave globale la label: `Nationale 1` in due sport diversi deve rimanere distinta.
- Usa come ambito logico almeno Paese + Sport/Disciplina/Variante pertinente + Ente + chiave Categoria. Riusa il modello esistente senza introdurre un nuovo livello canonico per ogni differenza testuale.
- L’importazione o il seed deve essere ripetibile secondo il meccanismo esistente: una riesecuzione non deve duplicare enti o categorie, cambiare identificatori o alterare l’ordine italiano.
- Le tabelle territoriali in appendice sono riferimenti originali, non istruzioni di import geografico. Non creare o riscrivere regioni, dipartimenti, `geo_areas`, codici Paese o mapping oltremare in questo incarico.
- Non assumere che le 18 strutture territoriali del foglio originale valgano allo stesso modo per tutte le federazioni. Non creare una matrice Sport × Ligue dedotta automaticamente.
- Non generare nuovi campionati dalle note su gironi, livelli, formule o territori.

## 8. Verifiche richieste e consegna

Usa le suite e le convenzioni del repository. Aggiungi verifiche data-driven significative sulla matrice di questa specifica e sui punti modificati:

1. Conteggi finali della sezione 9, enti, label e ordine francesi corretti.
2. Ogni categoria associata al solo contesto Paese + Sport + Ente autorizzato; nessuna categoria francese nei menu italiani e viceversa.
3. Esattamente una Giovanili per Calcio + FFF e una per Hockey su ghiaccio + FFHG; nessuna categoria Under separata nel nuovo catalogo.
4. Sport esistenti conservati, Calcio/Calcio a 8/Futsal distinti e alias Volley/Basket senza nuovi duplicati.
5. Le categorie generiche e professionistiche previste sono effettivamente selezionabili.
6. Reset dei campi incompatibili quando cambia il contesto e rifiuto server-side di combinazioni miste, anche manipolando direttamente la richiesta.
7. Creazione e rilettura dopo refresh di un Club francese con tre iscrizioni come nell’esempio; divieto di duplicati e una sola principale.
8. Profilo pubblico e Opportunity mostrano e conservano la combinazione francese corretta; disattivare un’iscrizione non compromette l’Opportunity.
9. I controlli di proprietà e RLS restano validi; un Club non può modificare iscrizioni altrui.
10. Italia e fallback legacy non regrediscono; i client esistenti rimangono compatibili.
11. Seed/migration ripetibile e nessun duplicato, verificati localmente con il meccanismo appropriato. Esegui il replay locale delle migration se disponibile; se non lo è, indica che non è stato eseguito.

Esegui lint, typecheck, test pertinenti e `git diff --check` secondo gli script del progetto. Non collegarti a database remoti per soddisfare questi controlli e non dichiarare PASS per verifiche non eseguite.

Al termine riporta: schema/meccanismo riutilizzato, file modificati, matrice e conteggi implementati, comportamento del filtro Paese, regola Giovanili, gestione principale e Opportunity, compatibilità Italia/legacy, test eseguiti e limiti concreti. Indica esplicitamente che nessuna migration remota o pubblicazione è stata eseguita. Non richiedere al product owner di riscrivere il catalogo o ricostruire le associazioni già definite qui.

## 9. Riconciliazione del catalogo

- Origine: 92 righe nel foglio Campionati e Categorie, dalla riga 5 alla 96.
- Voci Sport originali: 13; gruppi Sport applicativi dopo separazione Baseball/Softball: 14.
- Enti francesi selezionabili: 11.
- Categorie finali (combinazioni distinte Paese + Sport + Ente + Categoria): **98**.
- Tutte le 92 righe originali sono rappresentate; le sostituzioni Giovanili confluiscono in due categorie uniche.

| Sport | Ente | Categorie finali |
| --- | --- | --- |
| Calcio | FFF | 11 |
| Calcio a 8 | FFF | 1 |
| Futsal | FFF | 5 |
| Pallavolo | FFvolley | 12 |
| Pallacanestro | FFBB | 15 |
| Pallamano | FFHandball | 13 |
| Rugby | FFR | 14 |
| Hockey su ghiaccio | FFHG | 6 |
| Pallanuoto | FFN | 6 |
| Hockey su prato | FFH | 4 |
| Baseball | FFBS | 4 |
| Softball | FFBS | 2 |
| Football americano | FFFA | 4 |
| Lacrosse | France Lacrosse | 1 |

SHA-256 dell’Excel originale: `5cb241738aa98b0e80b0f814ef6fd5caa65189211d5c6b9ec6dd15fc07c6b297`.

## Appendice A. Dati originali dei campionati

Questa appendice è una trascrizione del file fornito, non un secondo catalogo da importare. In caso di differenza applica la sezione 5. Le note originarie possono essere generiche o non aggiornate e non vanno trasformate in vincoli applicativi.

| Riga Excel | Sport originale | Federazione / Organizzatore originale | Categoria originale | Livello / Ambito originale | Natura originale | Note originali |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Calcio | Fédération Française de Football (FFF) / LFP | National | Nazionale (3° livello) | Semi-Professionistico | Ibrido tra pro retrocessi e dilettanti |
| 6 | Calcio | Fédération Française de Football (FFF) | National 2 | Nazionale (4° livello) | Dilettantistico | 4 gironi da 16 squadre; vertice dilettantistico |
| 7 | Calcio | Fédération Française de Football (FFF) | National 3 | Nazionale / Regionale (5° livello) | Dilettantistico | 10-12 gironi gestiti territorialmente |
| 8 | Calcio | Ligues Régionales (FFF) | Régional 1 (R1) | Regionale (6° livello) | Dilettantistico | Gestito dalle 13 Ligues metropolitane + 5 Outre-Mer |
| 9 | Calcio | Ligues Régionales (FFF) | Régional 2 (R2) | Regionale (7° livello) | Dilettantistico | Gestito dalle Ligues Régionales |
| 10 | Calcio | Ligues Régionales (FFF) | Régional 3 (R3) | Regionale (8° livello) | Dilettantistico | Gestito dalle Ligues Régionales |
| 11 | Calcio | Districts Départementaux (FFF) | District 1 (D1) | Dipartimentale (9° livello) | Dilettantistico | Gestito dai Comitati Dipartimentali |
| 12 | Calcio | Districts Départementaux (FFF) | District 2 (D2) e inf. | Dipartimentale (10°+ livello) | Dilettantistico | Livelli di base locali |
| 13 | Calcio | Fédération Française de Football (FFF) | Arkema Première Ligue | Nazionale Femminile (1° livello) | Professionistico | Massima serie femminile |
| 14 | Calcio | Fédération Française de Football (FFF) | Seconde Ligue | Nazionale Femminile (2° livello) | Semi-Professionistico / Dilettantistico | Ex Division 2 Féminine |
| 15 | Calcio | Fédération Française de Football (FFF) | Championnat National U19 | Giovanile Nazionale | Dilettantistico / Giovanile | Campionato Nazionale Under 19 |
| 16 | Calcio | Fédération Française de Football (FFF) | Championnat National U17 | Giovanile Nazionale | Dilettantistico / Giovanile | Campionato Nazionale Under 17 |
| 17 | Calcio | Fédération Française de Football (FFF) | Championnat National Féminin U19 | Giovanile Nazionale Femminile | Dilettantistico / Giovanile | Under 19 Femminile |
| 18 | Calcio a 8 | Fédération Française de Football (FFF) | Pratica / Formato Territoriale | Regionale / Dipartimentale | Amatoriale | Trattato come formato di gioco, organizzazione locale |
| 19 | Futsal | Fédération Française de Football (FFF) | D1 Futsal | Nazionale (1° livello) | Dilettantistico d'Élite | Massima serie futsal |
| 20 | Futsal | Fédération Française de Football (FFF) | D2 Futsal | Nazionale (2° livello) | Dilettantistico | Secondo livello nazionale |
| 21 | Futsal | Fédération Française de Football (FFF) | Competizione Nazionale Femminile | Nazionale Femminile | Dilettantistico | Denominazione e formula in fase di validazione |
| 22 | Futsal | Ligues Régionales / Districts (FFF) | Régional Futsal / District Futsal | Regionale / Dipartimentale | Amatoriale | Campionati territoriali di base |
| 23 | Volley | Ligue Nationale de Volley (LNV) / FFvolley | Marmara SpikeLigue | Nazionale Maschile (1° livello) | Professionistico | Lega Pro Maschile |
| 24 | Volley | Ligue Nationale de Volley (LNV) / FFvolley | Saforelle Power 6 | Nazionale Femminile (1° livello) | Professionistico | Lega Pro Femminile |
| 25 | Volley | Ligue Nationale de Volley (LNV) / FFvolley | Ligue B Masculine | Nazionale Maschile (2° livello) | Professionistico | Secondo livello pro |
| 26 | Volley | Fédération Française de Volley (FFvolley) | Élite Masculine | Nazionale Maschile (3° livello) | Dilettantistico d'Élite | Vertice amatoriale ad alto rendimento |
| 27 | Volley | Fédération Française de Volley (FFvolley) | Élite Féminine | Nazionale Femminile (2°/3° livello) | Dilettantistico d'Élite | Vertice amatoriale femminile |
| 28 | Volley | Fédération Française de Volley (FFvolley) | Nationale 2 Masculine | Nazionale Maschile (4° livello) | Dilettantistico | Suddiviso in gironi territoriali |
| 29 | Volley | Fédération Française de Volley (FFvolley) | Nationale 2 Féminine | Nazionale Femminile (4° livello) | Dilettantistico | Suddiviso in gironi territoriali |
| 30 | Volley | Fédération Française de Volley (FFvolley) | Nationale 3 Masculine | Nazionale Maschile (5° livello) | Dilettantistico | Divisione amatoriale nazionale |
| 31 | Volley | Fédération Française de Volley (FFvolley) | Nationale 3 Féminine | Nazionale Femminile (5° livello) | Dilettantistico | Divisione amatoriale nazionale |
| 32 | Volley | Ligues Régionales (FFvolley) | Pré-Nationale / Régionale | Regionale | Amatoriale | Gestito dalle Ligues Régionales |
| 33 | Volley | Comités Départementaux (FFvolley) | Départementale | Dipartimentale | Amatoriale | Attività locale e promozionale |
| 34 | Basket | Ligue Nationale de Basket (LNB) / FFBB | Betclic ÉLITE | Nazionale Maschile (1° livello) | Professionistico | Massimo campionato pro |
| 35 | Basket | Ligue Nationale de Basket (LNB) / FFBB | ÉLITE 2 (Pro B) | Nazionale Maschile (2° livello) | Professionistico | Secondo livello pro |
| 36 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Masculine 1 (NM1) | Nazionale Maschile (3° livello) | Semi-Professionistico | Terzo livello nazionale con Play-off |
| 37 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Masculine 2 (NM2) | Nazionale Maschile (4° livello) | Dilettantistico | Gironi interregionali |
| 38 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Masculine 3 (NM3) | Nazionale Maschile (5° livello) | Dilettantistico | Gironi interregionali |
| 39 | Basket | Fédération Française de BasketBall (FFBB) | La Boulangère Wonderligue | Nazionale Femminile (1° livello) | Professionistico | Ex Ligue Féminine de Basket (LFB) |
| 40 | Basket | Fédération Française de BasketBall (FFBB) | Ligue Féminine 2 (LF2) | Nazionale Femminile (2° livello) | Semi-Professionistico | Secondo livello femminile |
| 41 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Féminine 1 (NF1) | Nazionale Femminile (3° livello) | Dilettantistico d'Élite | Vertice dilettantistico femminile |
| 42 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Féminine 2 (NF2) | Nazionale Femminile (4° livello) | Dilettantistico | Divisione amatoriale nazionale |
| 43 | Basket | Fédération Française de BasketBall (FFBB) | Nationale Féminine 3 (NF3) | Nazionale Femminile (5° livello) | Dilettantistico | Divisione amatoriale nazionale |
| 44 | Basket | Comités Régionaux (FFBB) | Régionale 1 / R2 / R3 | Regionale | Amatoriale | Gestito dai Comitati Regionali |
| 45 | Basket | Comités Départementaux (FFBB) | Pré-Régionale / Départementale | Dipartimentale | Amatoriale | Gestito dai Comitati Dipartimentali |
| 46 | Pallamano | Ligue Nationale de Handball (LNH) / FFHandball | Liqui Moly StarLigue | Nazionale Maschile (1° livello) | Professionistico | Massima serie maschile |
| 47 | Pallamano | Ligue Nationale de Handball (LNH) / FFHandball | ProLigue | Nazionale Maschile (2° livello) | Professionistico | Seconda serie maschile |
| 48 | Pallamano | Ligue Féminine de Handball (LFH) / FFHandball | D1F (Ligue Butagaz Énergie) | Nazionale Femminile (1° livello) | Professionistico | Massima serie femminile |
| 49 | Pallamano | Ligue Féminine de Handball (LFH) / FFHandball | D2F | Nazionale Femminile (2° livello) | Semi-Professionistico | Seconda serie femminile |
| 50 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 1 Masculine (N1M) | Nazionale Maschile (3° livello) | Semi-Pro / Dilettantistico | Include Poule Élite e Poules de secteur |
| 51 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 2 Masculine (N2M) | Nazionale Maschile (4° livello) | Dilettantistico | Divisione amatoriale per gironi |
| 52 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 3 Masculine (N3M) | Nazionale Maschile (5° livello) | Dilettantistico | Divisione amatoriale per gironi |
| 53 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 1 Féminine (N1F) | Nazionale Femminile (3° livello) | Dilettantistico d'Élite | Vertice amatoriale femminile |
| 54 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 2 Féminine (N2F) | Nazionale Femminile (4° livello) | Dilettantistico | Divisione amatoriale |
| 55 | Pallamano | Fédération Française de Handball (FFHandball) | Nationale 3 Féminine (N3F) | Nazionale Femminile (5° livello) | Dilettantistico | Divisione amatoriale |
| 56 | Pallamano | Ligues Régionales (FFHandball) | Prénationale / Régionale | Regionale | Amatoriale | Gestito dalle Ligues Régionales |
| 57 | Pallamano | Comités Départementaux (FFHandball) | Départementale | Dipartimentale | Amatoriale | Campionati locali di base |
| 58 | Rugby | Ligue Nationale de Rugby (LNR) / FFR | Top 14 | Nazionale Maschile (1° livello) | Professionistico | Massima serie professionistica |
| 59 | Rugby | Ligue Nationale de Rugby (LNR) / FFR | Pro D2 | Nazionale Maschile (2° livello) | Professionistico | Seconda serie professionistica |
| 60 | Rugby | Fédération Française de Rugby (FFR) | Nationale | Nazionale Maschile (3° livello) | Semi-Professionistico | Transizione verso il professionismo |
| 61 | Rugby | Fédération Française de Rugby (FFR) | Nationale 2 | Nazionale Maschile (4° livello) | Semi-Pro / Dilettantistico | Élite amatoriale |
| 62 | Rugby | Fédération Française de Rugby (FFR) | Fédérale 1 | Nazionale Maschile (5° livello) | Dilettantistico d'Élite | Spina dorsale del rugby amatoriale |
| 63 | Rugby | Fédération Française de Rugby (FFR) | Fédérale 2 | Nazionale Maschile (6° livello) | Dilettantistico | Campionato amatoriale nazionale |
| 64 | Rugby | Fédération Française de Rugby (FFR) | Fédérale 3 | Nazionale Maschile (7° livello) | Dilettantistico | Campionato amatoriale nazionale |
| 65 | Rugby | Fédération Française de Rugby (FFR) | Élite 1 Féminine | Nazionale Femminile (1° livello) | Dilettantistico d'Élite | Massimo campionato femminile |
| 66 | Rugby | Fédération Française de Rugby (FFR) | Élite 2 Féminine | Nazionale Femminile (2° livello) | Dilettantistico | Secondo livello femminile |
| 67 | Rugby | Fédération Française de Rugby (FFR) | Fédérale 1 Féminine | Nazionale Femminile (3° livello) | Dilettantistico | Terzo livello femminile |
| 68 | Rugby | Fédération Française de Rugby (FFR) | Fédérale 2 Féminine | Nazionale Femminile (4° livello) | Dilettantistico | Quarto livello femminile |
| 69 | Rugby | Ligues Régionales (FFR) | Régionale 1 | Regionale (8° livello) | Amatoriale | Gestito dalle 13 Ligues Régionales |
| 70 | Rugby | Ligues Régionales (FFR) | Régionale 2 | Regionale (9° livello) | Amatoriale | Gestito dalle Ligues Régionales |
| 71 | Rugby | Ligues Régionales (FFR) | Régionale 3 | Regionale (10° livello) | Amatoriale | Gestito dalle Ligues Régionales |
| 72 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | Synerglace Ligue Magnus | Nazionale Maschile (1° livello) | Professionistico | Massimo campionato nazionale |
| 73 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | Division 1 | Nazionale Maschile (2° livello) | Semi-Professionistico | Secondo livello nazionale |
| 74 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | Division 2 | Nazionale Maschile (3° livello) | Dilettantistico | Terzo livello amatoriale |
| 75 | Hockey su Ghiaccio | Fédération Française de Hockey su Ghiaccio (FFHG) | Division 3 | Nazionale / Regionale (4° livello) | Dilettantistico | Suddiviso in Poules regionali (Nord, Est, Ouest, ecc.) |
| 76 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | Championnat Féminin | Nazionale Femminile | Dilettantistico | Denominazione/formula in aggiornamento |
| 77 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | U20 (Élite / Excellence) | Giovanile Nazionale | Dilettantistico / Giovanile | Campionato Under 20 |
| 78 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | U18 (Élite / Excellence) | Giovanile Nazionale | Dilettantistico / Giovanile | Campionato Under 18 |
| 79 | Hockey su Ghiaccio | Fédération Française de Hockey sur Glace (FFHG) | U15 | Giovanile Regionale | Dilettantistico / Giovanile | Campionato Under 15 |
| 80 | Pallanuoto | Fédération Française de Natation (FFN) | Élite Masculine / Féminine | Nazionale (1° livello) | Semi-Pro / Dilettantistico | Massima serie nazionale |
| 81 | Pallanuoto | Fédération Française de Natation (FFN) | Nationale 1 | Nazionale (2° livello) | Dilettantistico | Secondo livello |
| 82 | Pallanuoto | Fédération Française de Natation (FFN) | Nationale 2 | Nazionale (3° livello) | Dilettantistico | Terzo livello |
| 83 | Pallanuoto | Fédération Française de Natation (FFN) | Nationale 3 / Regionale | Regionale (4° livello) | Amatoriale | Gironi locali e regionali |
| 84 | Hockey su Prato | Fédération Française de Hockey (FFH) | Elite Masculine / Féminine | Nazionale (1° livello) | Dilettantistico d'Élite | Massimo campionato |
| 85 | Hockey su Prato | Fédération Française de Hockey (FFH) | Nationale 1 | Nazionale (2° livello) | Dilettantistico | Secondo livello |
| 86 | Hockey su Prato | Fédération Française de Hockey (FFH) | Nationale 2 | Nazionale (3° livello) | Dilettantistico | Terzo livello |
| 87 | Baseball e Softball | Fédération Française de Baseball et Softball (FFBS) | Division 1 (Baseball) | Nazionale (1° livello) | Dilettantistico d'Élite | Massimo campionato baseball |
| 88 | Baseball e Softball | Fédération Française de Baseball et Softball (FFBS) | Division 2 (Baseball) | Nazionale (2° livello) | Dilettantistico | Secondo livello baseball |
| 89 | Baseball e Softball | Fédération Française de Baseball et Softball (FFBS) | Nationale 1 (Baseball) | Nazionale (3° livello) | Dilettantistico | Terzo livello baseball |
| 90 | Baseball e Softball | Fédération Française de Baseball et Softball (FFBS) | Division 1 (Softball) | Nazionale Femminile / Misto | Dilettantistico | Massimo campionato softball |
| 91 | Baseball e Softball | Ligues Régionales (FFBS) | Régionale (Baseball / Softball) | Regionale | Amatoriale | Campionati amatoriali locali |
| 92 | Football Americano | Fédération Française de Football Américain (FFFA) | Division 1 (Casque de Diamant) | Nazionale (1° livello) | Dilettantistico d'Élite | Massima serie nazionale |
| 93 | Football Americano | Fédération Française de Football Américain (FFFA) | Division 2 (Casque d'Or) | Nazionale (2° livello) | Dilettantistico | Secondo livello |
| 94 | Football Americano | Fédération Française de Football Américain (FFFA) | Division 3 (Casque d'Argent) | Nazionale (3° livello) | Dilettantistico | Terzo livello |
| 95 | Football Americano | Ligues Régionales (FFFA) | Régionale | Regionale | Amatoriale | Campionati regionali di base |
| 96 | Lacrosse | France Lacrosse / Association Française de Lacrosse (AFL) | Championnat de France de Lacrosse | Nazionale | Amatoriale | Tornei e campionati a concentramento |

## Appendice B. Struttura territoriale originale, solo riferimento

Il file presenta 13 strutture metropolitane e 5 oltremare. Riportate senza trasformarle in associazioni federali verificate o nuovi campi delle iscrizioni.

| Riga Excel | Tipologia | Ligue / Territorio originale | N. dipartimenti originale | Dipartimenti originali | Ruolo indicato nel file |
| --- | --- | --- | --- | --- | --- |
| 5 | Metropolitana | Ligue Auvergne-Rhône-Alpes | 12 | 01 Ain, 03 Allier, 07 Ardèche, 15 Cantal, 26 Drôme, 38 Isère, 42 Loire, 43 Haute-Loire, 63 Puy-de-Dôme, 69 Rhône, 73 Savoie, 74 Haute-Savoie | Gestisce R1, R2, R3 e qualificazioni giovanili per AURA |
| 6 | Metropolitana | Ligue Bourgogne-Franche-Comté | 8 | 21 Côte-d'Or, 25 Doubs, 39 Jura, 58 Nièvre, 70 Haute-Saône, 71 Saône-et-Loire, 89 Yonne, 90 Territoire de Belfort | Gestisce i campionati regionali BFC |
| 7 | Metropolitana | Ligue de Bretagne | 4 | 22 Côtes-d'Armor, 29 Finistère, 35 Ille-et-Vilaine, 56 Morbihan | Gestisce i campionati regionali bretoni |
| 8 | Metropolitana | Ligue du Centre-Val de Loire | 6 | 18 Cher, 28 Eure-et-Loir, 36 Indre, 37 Indre-et-Loire, 41 Loir-et-Cher, 45 Loiret | Gestisce l'attività regionale Centre-Val de Loire |
| 9 | Metropolitana | Ligue Corse | 2 | 2A Corse-du-Sud, 2B Haute-Corse | Gestisce le competizioni dell'isola di Corsica |
| 10 | Metropolitana | Ligue du Grand Est | 10 | 08 Ardennes, 10 Aube, 51 Marne, 52 Haute-Marne, 54 Meurthe-et-Moselle, 55 Meuse, 57 Moselle, 67 Bas-Rhin, 68 Haut-Rhin, 88 Vosges | Accorpa Alsazia, Lorena e Champagne-Ardenne |
| 11 | Metropolitana | Ligue des Hauts-de-France | 5 | 02 Aisne, 59 Nord, 60 Oise, 62 Pas-de-Calais, 80 Somme | Accorpa Nord-Pas-de-Calais e Piccardia |
| 12 | Metropolitana | Ligue de Paris-Île-de-France | 8 | 75 Paris, 77 Seine-et-Marne, 78 Yvelines, 91 Essonne, 92 Hauts-de-Seine, 93 Seine-Saint-Denis, 94 Val-de-Marne, 95 Val-d'Oise | Maggiore bacino di tesserati della Francia |
| 13 | Metropolitana | Ligue de Normandie | 5 | 14 Calvados, 27 Eure, 50 Manche, 61 Orne, 76 Seine-Maritime | Accorpa Alta e Bassa Normandia |
| 14 | Metropolitana | Ligue de Nouvelle-Aquitaine | 12 | 16 Charente, 17 Charente-Maritime, 19 Corrèze, 23 Creuse, 24 Dordogne, 33 Gironde, 40 Landes, 47 Lot-et-Garonne, 64 Pyrénées-Atlantiques, 79 Deux-Sèvres, 86 Vienne, 87 Haute-Vienne | La più estesa regione geografica metropolitana |
| 15 | Metropolitana | Ligue d'Occitanie | 13 | 09 Ariège, 11 Aude, 12 Aveyron, 30 Gard, 31 Haute-Garonne, 32 Gers, 34 Hérault, 46 Lot, 48 Lozère, 65 Hautes-Pyrénées, 66 Pyrénées-Orientales, 81 Tarn, 82 Tarn-et-Garonne | Accorpa Languedoc-Roussillon e Midi-Pyrénées |
| 16 | Metropolitana | Ligue des Pays de la Loire | 5 | 44 Loire-Atlantique, 49 Maine-et-Loire, 53 Mayenne, 72 Sarthe, 85 Vendée | Gestisce le competizioni dei Pays de la Loire |
| 17 | Metropolitana | Ligue de Méditerranée (PACA) | 6 | 04 Alpes-de-Haute-Provence, 05 Hautes-Alpes, 06 Alpes-Maritimes, 13 Bouches-du-Rhône, 83 Var, 84 Vaucluse | Regione Provence-Alpes-Côte d'Azur |
| 18 | DROM (Oltremare) | Ligue de Football / Sport de la Guadeloupe | 1 (971) | 971 Guadalupa (Caraibi) | DROM integrato. Partecipa a Coupe de France e fasi finali d'Outre-Mer |
| 19 | DROM (Oltremare) | Ligue de Football / Sport de la Martinique | 1 (972) | 972 Martinica (Caraibi) | DROM integrato. Partecipa a Coupe de France e fasi finali d'Outre-Mer |
| 20 | DROM (Oltremare) | Ligue de Football / Sport de la Guyane | 1 (973) | 973 Guyana Francese (Sud America) | DROM integrato. Partecipa a Coupe de France e fasi finali d'Outre-Mer |
| 21 | DROM (Oltremare) | Ligue de Football / Sport de La Réunion | 1 (974) | 974 La Réunion (Oceano Indiano) | DROM integrato. Partecipa a Coupe de France e fasi finali d'Outre-Mer |
| 22 | DROM (Oltremare) | Ligue de Football / Sport de Mayotte | 1 (976) | 976 Mayotte (Oceano Indiano) | DROM integrato. Partecipa a Coupe de France e fasi finali d'Outre-Mer |

## Appendice C. Sintesi federazioni originale, solo riferimento

La sezione 4 stabilisce le label effettivamente selezionabili. Questa trascrizione conserva le informazioni di governance ricevute, senza introdurre nuovi enti o menu.

| Riga Excel | Sport originale | Sigla originale | Nome completo originale | Lega professionistica indicata | Articolazione regionale indicata | Articolazione dipartimentale indicata |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Calcio / Futsal / Calcio a 8 | FFF | Fédération Française de Football | LFP (Ligue de Football Professionnel) | 13 Metropolitane + 5 Outre-Mer | ~90 Districts |
| 6 | Volley | FFvolley | Fédération Française de Volley | LNV (Ligue Nationale de Volley) | 13 Metropolitane + Outre-Mer | Comités Départementaux |
| 7 | Basket | FFBB | Fédération Française de BasketBall | LNB (Ligue Nationale de Basket) | 13 Comités Régionaux + Outre-Mer | Comités Départementaux |
| 8 | Pallamano | FFHandball | Fédération Française de Handball | LNH (Maschile) & LFH (Femminile) | 13 Ligues Régionales + Outre-Mer | Comités Départementaux |
| 9 | Rugby | FFR | Fédération Française de Rugby | LNR (Ligue Nationale de Rugby) | 13 Ligues Régionales + Outre-Mer | Comités Départementaux (Sviluppo) |
| 10 | Hockey su Ghiaccio | FFHG | Fédération Française de Hockey sur Glace | Nessuna (Gestione diretta FFHG) | Ligues Régionales / Zones | Club diretti / Distretti |
| 11 | Pallanuoto | FFN | Fédération Française de Natation | Nessuna (Gestione diretta FFN) | Ligues Régionales de Natation | Comités Départementaux |
| 12 | Hockey su Prato | FFH | Fédération Française de Hockey | Nessuna (Gestione diretta FFH) | Ligues Régionales | Comités Départementaux |
| 13 | Baseball e Softball | FFBS | Fédération Française de Baseball et Softball | Nessuna (Gestione diretta FFBS) | Ligues Régionales | Comités Départementaux |
| 14 | Football Americano | FFFA | Fédération Française de Football Américain | Nessuna (Gestione diretta FFFA) | Ligues Régionales | Comités Départementaux |
| 15 | Lacrosse | France Lacrosse / AFL | Association Française de Lacrosse | Nessuna | Coordinamento territoriale unico | Nessuno |
