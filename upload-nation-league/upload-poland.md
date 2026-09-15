# Club and Player — Polonia: dilettanti e giovanili

Revisione: 15 settembre 2026. Paese: `PL`. Percorso repo: `upload-nation-league/upload-poland.md`.

## 1. Incarico

Implementare il catalogo Polonia nel repository web `clubandplayer-app`, sotto il contesto Paese Polonia, riutilizzando il modello italiano delle Iscrizioni e le estensioni per Paese già presenti. Questo documento è autosufficiente: non serve l’Excel per l’importazione.

**Solo la sezione 5 è l’elenco di categorie da attivare.** Le esclusioni e le fonti sono documentazione e non devono diventare opzioni. Non usare i campionati professionistici elencati nell’audit per completare il catalogo.

## 2. Criterio di selezione

Richiesta: mantenere dilettanti, amatori e giovanili. Conservare le categorie dilettantistiche d’élite anche quando sono la massima serie di uno sport minore. Escludere le righe professionistiche e, per il perimetro iniziale prudente già usato per la Spagna, quelle semiprofessionistiche o miste, salvo correzioni federali esplicite riportate sotto.

Le verifiche ufficiali sono mirate alle ambiguità, agli organizzatori e alle principali correzioni. Dove non esiste una verifica separata, la natura dilettantistica deriva dalla colonna Natura del file utente. Non si certificano l’assenza di atleti retribuiti o tutti i contratti individuali. Non trasformare questa selezione in un badge «tutti dilettanti» o in un divieto di accesso per persone retribuite. La presenza di una lega in un sito federale conferma il nome o la struttura, non da sola il suo status economico.

Le voci non confermate sono sospese e identificate come tali: **sospeso non significa professionistico**. Non ampliare la lista chiusa senza nuovi dati. Non è necessario ripetere una ricerca generale per implementare le opzioni già definite.

## 3. Riconciliazione

| Misura | Conteggio |
| --- | --- |
| Righe originali Campionati e Categorie | 54 |
| Righe mantenute, comprese le porzioni ammesse | 38 |
| Righe interamente escluse o sospese | 16 |
| Categorie normalizzate da attivare | 49 |
| Sport / discipline selezionati | 14 |
| Enti / raggruppamenti applicativi distinti | 12 |
| Opzioni Giovanili dopo accorpamento | 2 |

I conteggi delle righe e delle categorie differiscono: una riga può contenere più categorie e più righe giovanili possono confluire in una sola opzione. Le righe citate nella sezione 5 si riferiscono all’Excel originale, prima del filtraggio.

## 4. Correzioni e interpretazioni vincolanti

- Calcio a 6 / Playarena e Socca: correggere il formato e usare il relativo organizzatore, senza affiliazione PZPN inventata. Orlik giovanile confluisce in Calcio / PZPN / Giovanili.
- 3. Liga: rimosso lo sponsor Betclic. Conservare il quarto livello solo come informazione descrittiva; non confonderla con la 2. Liga esclusa.
- Riga 39 di volley: contiene 1. e 2. Liga Kobiet con una sola etichetta Semi-Pro / Dilettantistico. Non c’è una classificazione separata sufficientemente accertata: sospendere entrambe, senza chiamare professionistica la 2. Liga. Potranno essere recuperate con una verifica specifica.
- 1. Liga (MHL) di hockey resta una sola categoria senior/sviluppo: il nome Młodzieżowa non basta a trattarla integralmente come Under. Non creare un Giovanili aggiuntivo da questa riga.
- PFL Junior confluisce in Giovanili del Football americano; Flag Football resta distinto. PFL del lacrosse e la sigla della competizione di football americano non sono lo stesso ente.
- Gli ambiti regionali si riferiscono alle federazioni nazionali di riferimento: i WZPN/WZKosz ecc. sono livelli territoriali, non una singola nuova federazione con un acronimo collettivo.

### Enti di riferimento

| Label breve | Denominazione / significato |
| --- | --- |
| PZPN | Polski Związek Piłki Nożnej |
| Playarena / Socca Poland | Playarena / Polska Federacja Socca |
| PZKosz | Polski Związek Koszykówki |
| ZPRP | Związek Piłki Ręcznej w Polsce |
| PZPS | Polski Związek Piłki Siatkowej |
| PZHL | Polski Związek Hokeja na Lodzie |
| PZP | Polski Związek Pływacki (Komitet Piłki Wodnej) |
| PZHT | Polski Związek Hokeja na Trawie |
| PZBiS | Polski Związek Baseballu i Softballu |
| ZFAP | Związek Futbolu Amerykańskiego w Polsce |
| PZR | Polski Związek Rugby |
| PFL | Polska Federacja Lacrosse |

I nomi generici di leghe locali sono categorie ammesse quando già presenti nella fonte. «Organizzatori locali» è un raggruppamento applicativo, non il nome di una federazione ufficiale. Gli acronimi collettivi regionali vengono ricondotti all’ente nazionale di riferimento solo come struttura di catalogo, senza attribuirgli una gestione diretta non documentata.

## 5. Catalogo attivo — elenco chiuso

Ogni riga è una combinazione valida Paese + Sport + Ente + Categoria. Non fare prodotti cartesiani fra le colonne. Usare l’ordine di prima comparsa, con Giovanili in fondo al relativo gruppo. I riferimenti originali sono metadati di provenienza, non nuovi campi del form.

### Calcio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZPN | 3. Liga | Dilettantistico d'Élite | 8 |
| PZPN | 4. Liga | Dilettantistico | 9 |
| PZPN | Klasa Okręgowa (Okręgówka) | Dilettantistico | 10 |
| PZPN | Klasa A | Amatoriale | 11 |
| PZPN | Klasa B | Amatoriale | 11 |
| PZPN | Klasa C | Amatoriale | 11 |
| PZPN | 1. Liga Kobiet | Dilettantistico d'Élite | 13 |
| PZPN | 2. Liga Kobiet | Dilettantistico | 14 |
| PZPN | 3. Liga Kobiet | Dilettantistico | 14 |
| PZPN | Giovanili | Giovanile | 15, 17 |

### Calcio a 6

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Playarena / Socca Poland | Liga Playarena | Amatoriale | 16 |
| Playarena / Socca Poland | Mistrzostwa Polski Socca | Amatoriale | 16 |

### Futsal

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZPN | 1. Liga Futsalu | Dilettantistico d'Élite | 19 |
| PZPN | 2. Liga Futsalu | Amatoriale | 20 |
| PZPN | Ligi Środowiskowe | Amatoriale | 20 |
| PZPN | Ekstraliga Kobiety Futsal | Dilettantistico d'Élite | 21 |

### Pallacanestro

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZKosz | 2. Liga Mężczyzn | Dilettantistico d'Élite | 24 |
| PZKosz | 3. Liga Mężczyzn | Dilettantistico | 25 |
| PZKosz | Ligi Regionalne | Dilettantistico | 25 |
| PZKosz | 1. Liga Kobiet | Dilettantistico d'Élite | 27 |

### Pallamano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZPRP | I Liga Mężczyzn | Dilettantistico d'Élite | 30 |
| ZPRP | II Liga Mężczyzn | Dilettantistico / Amatoriale | 31 |
| ZPRP | III Liga Mężczyzn | Dilettantistico / Amatoriale | 31 |
| ZPRP | Liga Centralna Kobiet | Dilettantistico d'Élite | 33 |
| ZPRP | I Liga Kobiet | Dilettantistico d'Élite | 33 |

### Pallavolo

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZPS | 2. Liga Mężczyzn | Dilettantistico d'Élite | 36 |
| PZPS | 3. Liga Mężczyzn | Dilettantistico | 37 |
| PZPS | 4. Liga Mężczyzn | Dilettantistico | 37 |

### Hockey su ghiaccio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZHL | 1. Liga (MHL) | Dilettantistico d'Élite | 41 |
| PZHL | 2. Liga | Amatoriale | 42 |
| PZHL | Liga Hokeja Kobiet | Dilettantistico d'Élite | 43 |

### Pallanuoto

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZP | Ekstraklasa Piłki Wodnej | Dilettantistico d'Élite | 44 |
| PZP | 1. Liga Piłki Wodnej | Dilettantistico | 45 |

### Hockey su prato

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZHT | Superliga Hokeja na Trawie | Dilettantistico d'Élite | 46 |
| PZHT | 1. Liga Hokeja na Trawie | Dilettantistico | 47 |
| PZHT | Halowy Hokej na Trawie | Dilettantistico | 48 |

### Baseball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZBiS | Ekstraliga Baseballowa | Dilettantistico d'Élite | 49 |
| PZBiS | 1. Liga Baseballowa | Dilettantistico | 50 |

### Softball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZBiS | Ekstraliga Softballu Kobiet | Dilettantistico | 51 |

### Football americano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZFAP | PFL 1 | Dilettantistico d'Élite | 52 |
| ZFAP | PFL 2 | Dilettantistico / Amatoriale | 53 |
| ZFAP | PFL 9 | Dilettantistico / Amatoriale | 53 |
| ZFAP | Flag Football | Amatoriale | 54 |
| ZFAP | Giovanili | Giovanile | 54 |

### Rugby

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PZR | Ekstraliga Rugby | Dilettantistico d'Élite | 55 |
| PZR | 1. Liga Rugby | Dilettantistico | 56 |
| PZR | 2. Liga Rugby | Dilettantistico | 56 |
| PZR | Mistrzostwa Polski Rugby 7 | Dilettantistico | 57 |

### Lacrosse

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| PFL | Polska Liga Lacrosse (PLL) | Amatoriale | 58 |

## 6. Esclusioni — non importare

| Riga originale | Sport | Voce esclusa | Motivo / stato | Dettaglio |
| --- | --- | --- | --- | --- |
| 5 | Calcio | PKO BP Ekstraklasa | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 6 | Calcio | Betclic 1. Liga | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 7 | Calcio | Betclic 2. Liga | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 12 | Calcio | Orlen Ekstraliga Kobiety | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 18 | Futsal | Futsal Ekstraklasa | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 22 | Basket | Orlen Basket Liga (OBL) | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 23 | Basket | Bank Pekao 1. Liga Mężczyzn | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 26 | Basket | Orlen Basket Liga Kobiet (OBLK) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 28 | Pallamano | ORLEN Superliga Mężczyzn | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 29 | Pallamano | Ligi Centralne Mężczyzn | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 32 | Pallamano | ORLEN Superliga Kobiet | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 34 | Volley | PlusLiga | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 35 | Volley | PLS 1. Liga (ex Krispol 1. Liga) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 38 | Volley | TAURON Liga | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 39 | Volley | 1. Liga Kobiet, 2. Liga Kobiet | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 40 | Hockey su Ghiaccio | THL / Tauron Hokej Liga | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |

## 7. Implementazione coerente con l’Italia

- Paese canonico `PL`: filtrare Sport → Ente/Federazione → Categoria usando il contesto Paese esistente. Non ricavarlo dalla lingua, dalla cittadinanza o dal nome di una città; non duplicare il selettore Paese.
- Prima individuare catalogo, seed, migrazioni, helper e flussi reali della repo. Riutilizzare gli ID canonici già presenti e il meccanismo di Iscrizioni multiple del Club. Non creare un catalogo alternativo o una seconda tabella di iscrizioni se la funzione esiste già.
- Sport sinonimi: Basket/Pallacanestro, Volley/Pallavolo, Unihockey/Floorball. Baseball e Softball distinti. Calcio, Calcio a 6, Calcio a 7, Calcio a 8 e Futsal non sono sinonimi. Se un formato selezionato manca, estendere la disciplina/variante con il meccanismo esistente e una label distinta; non mapparlo a Calcio a 8 per comodità. Preservare i valori legacy.
- Per Flag Football, football americano a 9 e rugby a 7 conservare le varianti esplicite della categoria nel modello comune; non confonderle con altre discipline. Lo Sci è il contenitore della fonte per le gare selezionate, non un’autorizzazione a creare tutti gli sport invernali. Biathlon resta distinto.
- Un solo Giovanili per combinazione Sport + Ente con dati giovanili ammessi. Collassare Under, Juniores e attività di base nelle combinazioni indicate. Non aggiungere Giovanili a sport privi di righe pertinenti in questo documento. Non eliminare il vivaio di un ente perché la sua prima squadra è professionistica.
- Gestire traduzioni tramite i18n esistente; nomi propri e acronimi rimangono riconoscibili. Gli alias non diventano nuove categorie. Niente sponsor, anni, stagioni, numero squadre o gironi nei nuovi identificatori. Non rinumerare le leghe dopo aver tolto i livelli superiori.
- Il Club può avere più Iscrizioni: anche stesso sport e categorie/enti diversi. Vietare solo i duplicati della combinazione completa. Una sola Iscrizione attiva principale, cambio atomico; tutte le attive visibili nel profilo pubblico con la principale per prima. Header/Dati Club dalla principale.
- Le Opportunity scelgono una Iscrizione attiva appartenente al Club, principale come default. Validare l’appartenenza e la coerenza lato server. Conservare i riferimenti necessari alle Opportunity già pubblicate anche dopo disattivazione dell’Iscrizione.
- Cambio Paese/Sport/Ente: azzerare le scelte dipendenti non più valide. Verificare lato server la combinazione completa; non affidarsi soltanto alle opzioni nascoste in UI.
- RLS e ownership restano attive. Nessun bypass tramite service_role per aggirare il modello. Nessuna riscrittura massiva di profili, Opportunity, esperienze, UUID o dati storici. Se esistono già categorie escluse, limitarne le nuove selezioni preservando riferimenti e visualizzazione storica.
- I fogli territoriali servono come contesto: non creare categorie diverse per cantone, MNZ o voivodato, né nuovi campi obbligatori. Non importare in blocco le sintesi federali o i loro esempi.
- Scope web: catalogo, Iscrizioni Club, menu Paese e Opportunity. Non riprogettare Mobile, Player, Staff, Fan, Institution o esperienze.
- Usare nuove migrazioni se necessarie, senza modificare quelle già applicate. Completare codice e verifiche locali; non applicare migrazioni remote, non distribuire in produzione e non fare merge/push senza istruzione separata.

## 8. Verifiche richieste a Codex

1. Riconciliare le **49 combinazioni** della sezione 5, senza duplicati, con le righe originali indicate. Nessuna voce esclusa deve essere disponibile nelle nuove selezioni.
2. Verificare isolamento per Paese e assenza di contaminazione con Italia, Francia, Spagna e gli altri Paesi. Le categorie omonime di sport/enti diversi devono restare distinte.
3. Verificare i **2 Giovanili**, i formati di calcio ridotti e le correzioni della sezione 4. Non creare categorie aggiuntive da alias o numeri di girone.
4. Verificare scelte dipendenti, combinazioni miste respinte lato server, più Iscrizioni, principale unica, ownership e conservazione delle Opportunity storiche.
5. Eseguire lint/typecheck e i test mirati disponibili nella repo. Verificare migrazioni/seed su ambiente locale se disponibile. Distinguere test eseguiti da quelli non eseguibili e riportare eventuali blocchi concreti.

## 9. Fonti e limiti

Fonte X: `Campionati_Dilettantistici_Polonia.xlsx`, tre fogli letti. Le classificazioni non corrette esplicitamente sono dati della fonte utente, non certificazioni federali autonome. SHA-256 originale: `cb75b08f4df9fedd5b39c5bfa41b3e66d3c8bffdee5fe433d29b42db1ddd94f2`.

| ID | Fonte | Che cosa è stato verificato |
| --- | --- | --- |
| P1 | [Playarena: circuito di calcio a 6](https://playarena.pl/) | Pagina ufficiale consultata: conferma il formato a 6 e il circuito Socca. Corregge la riga 16; non prova una competizione a 8 né una gestione PZPN. |
| P2 | [Polski Hokej: competizioni](https://polskihokej.eu/) | Portale ufficiale consultato: distingue THL, lega femminile e 1 LIGA, oltre alla sezione MHL. La presenza di sviluppo giovanile non rende tutta la 1. Liga una categoria esclusivamente Under. |
| P3 | [PZPS](https://www.pzps.pl/) | Portale federale consultato. Non certifica lo status lavorativo dei partecipanti alle divisioni inferiori. La riga aggregata 39 resta sospesa per natura mista non attribuita separatamente alle due leghe. |
| P4 | [Polska Liga Siatkówki](https://www.pls.pl/homePls/nocookies/1.html) | Portale dell’organizzatore consultato. Supporta il contesto delle leghe di vertice, non l’equivalenza fra tutte le serie chiamate 1. Liga. |
| P5 | [PZPN](https://pzpn.pl/) | Portale ufficiale consultato con riferimenti distinti a Betclic 1., 2. e 3. Liga. Il nome 3. Liga è il quarto livello, non il terzo. Nessuna deduzione automatica sul professionismo di ogni singolo giocatore. |

L’Excel filtrato conserva il foglio territoriale e la sintesi degli enti come documentazione. La vecchia colonna delle leghe professionistiche nella sintesi è sostituita dal perimetro selezionato, per non rimettere quelle leghe nel materiale di importazione. Eventuali informazioni territoriali storiche non vengono certificate da questa revisione.

## 10. Resoconto finale atteso

Elencare file modificati, conteggi importati per Paese/Sport/Ente, correzioni applicate, test eseguiti e passaggi locali eventualmente non disponibili. Distinguere implementazione da rilascio: nessuna migrazione remota o pubblicazione in produzione fa parte di questo incarico.
