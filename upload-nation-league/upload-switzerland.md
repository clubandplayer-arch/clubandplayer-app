# Club and Player — Svizzera: dilettanti e giovanili

Revisione: 15 settembre 2026. Paese: `CH`. Percorso repo: `upload-nation-league/upload-switzerland.md`.

## 1. Incarico

Implementare il catalogo Svizzera nel repository web `clubandplayer-app`, sotto il contesto Paese Svizzera, riutilizzando il modello italiano delle Iscrizioni e le estensioni per Paese già presenti. Questo documento è autosufficiente: non serve l’Excel per l’importazione.

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
| Categorie normalizzate da attivare | 56 |
| Sport / discipline selezionati | 12 |
| Enti / raggruppamenti applicativi distinti | 10 |
| Opzioni Giovanili dopo accorpamento | 3 |

I conteggi delle righe e delle categorie differiscono: una riga può contenere più categorie e più righe giovanili possono confluire in una sola opzione. Le righe citate nella sezione 5 si riferiscono all’Excel originale, prima del filtraggio.

## 4. Correzioni e interpretazioni vincolanti

- MyHockey League mantenuta e riclassificata come dilettantistica sulla base esplicita della SIHF. National League e Swiss League escluse.
- 1. Liga / 1ère Ligue, NLB / LNB e le altre traduzioni sono alias della stessa categoria, non campionati separati. La tabella sceglie una label canonica; preservare gli alias linguistici dell’input.
- Sci: mantenere BRACK Swiss Cup solo nel settore giovanile; non importare la categoria generica FIS Races. Le coppe IR confluiscono nella stessa voce Giovanili dello sport Sci. Non estendere automaticamente Sci a tutti gli sport invernali.
- La riga aggregata fondo/biathlon mantiene soltanto i Challenger giovanili del Biathlon. Non importare Swiss Cup senior né inventare un campionato di Sci di fondo da una riga che non separa le discipline.
- Junioren E/D confluisce in Calcio / ASF-SFV / Giovanili. Firmensport 7er è Calcio a 7 e il nome dell’organizzatore è SFFS. Nessuna delle due righe dimostra un campionato di Calcio a 8.
- Floorball e Unihockey sono alias. Grossfeld/Kleinfeld sono formati diversi: conservarne il significato, senza trasformare Kleinfeld in una divisione numerica.
- Per basket si usa NL1 Men come nome della terza serie della riga 30. Le righe senza distinzione di genere rimangono uniche; non raddoppiare NLB del volley in maschile/femminile senza dati separati.
- LNA del rugby mantenuta: la federazione descrive il rugby nazionale come amatoriale. Non rimuoverla solo perché è una prima divisione.

### Enti di riferimento

| Label breve | Denominazione / significato |
| --- | --- |
| ASF-SFV | Association Suisse de Football / Schweizerischer Fussballverband |
| SIHF | Swiss Ice Hockey Federation |
| swiss unihockey | Schweizerischer Unihockey Verband |
| Swiss Basketball | Fédération Suisse de Basketball |
| SHV-FSH | Schweizerischer Handball-Verband |
| Swiss Volley | Fédération Suisse de Volleyball |
| Swiss-Ski | Fédération Suisse de Ski |
| Swiss Tennis | Fédération Suisse de Tennis |
| FSR | Fédération Suisse de Rugby |
| SFFS | Schweizerischer Firmen- und Freizeitsportverband |

I nomi generici di leghe locali sono categorie ammesse quando già presenti nella fonte. «Organizzatori locali» è un raggruppamento applicativo, non il nome di una federazione ufficiale. Gli acronimi collettivi regionali vengono ricondotti all’ente nazionale di riferimento solo come struttura di catalogo, senza attribuirgli una gestione diretta non documentata.

## 5. Catalogo attivo — elenco chiuso

Ogni riga è una combinazione valida Paese + Sport + Ente + Categoria. Non fare prodotti cartesiani fra le colonne. Usare l’ordine di prima comparsa, con Giovanili in fondo al relativo gruppo. I riferimenti originali sono metadati di provenienza, non nuovi campi del form.

### Calcio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ASF-SFV | 1. Liga Classic | Dilettantistico d'Élite | 8 |
| ASF-SFV | 2. Liga interregional | Dilettantistico | 9 |
| ASF-SFV | 2. Liga | Amatoriale | 10 |
| ASF-SFV | 3. Liga | Amatoriale / Base | 11 |
| ASF-SFV | 4. Liga | Amatoriale / Base | 11 |
| ASF-SFV | 5. Liga | Amatoriale / Base | 11 |
| ASF-SFV | 1. Liga Frauen | Dilettantistico | 14 |
| ASF-SFV | Giovanili | Giovanile | 57 |

### Hockey su ghiaccio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| SIHF | MyHockey League | Dilettantistico d'Élite | 17 |
| SIHF | 1. Liga | Dilettantistico d'Élite | 18 |
| SIHF | 2. Liga | Dilettantistico | 19 |
| SIHF | 3. Liga | Amatoriale | 20 |
| SIHF | 4. Liga | Amatoriale | 20 |
| SIHF | SWHL B | Dilettantistico | 22 |
| SIHF | SWHL C | Dilettantistico | 22 |
| SIHF | SWHL D | Dilettantistico | 22 |

### Floorball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| swiss unihockey | NLB Herren | Dilettantistico d'Élite | 24 |
| swiss unihockey | 1. Liga Grossfeld | Dilettantistico | 25 |
| swiss unihockey | 2. Liga | Amatoriale | 26 |
| swiss unihockey | 3. Liga | Amatoriale | 26 |
| swiss unihockey | 4. Liga | Amatoriale | 26 |
| swiss unihockey | Kleinfeld | Amatoriale | 26 |

### Pallacanestro

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Swiss Basketball | NLB Men | Dilettantistico d'Élite | 29 |
| Swiss Basketball | NL1 Men | Dilettantistico | 30 |
| Swiss Basketball | 2LN | Amatoriale | 31 |
| Swiss Basketball | 3LN | Amatoriale | 31 |
| Swiss Basketball | Regional | Amatoriale | 31 |
| Swiss Basketball | NLB Women | Dilettantistico | 33 |

### Pallamano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| SHV-FSH | NLB Herren | Dilettantistico d'Élite | 35 |
| SHV-FSH | 1. Liga | Dilettantistico | 36 |
| SHV-FSH | 2. Liga | Amatoriale | 37 |
| SHV-FSH | 3. Liga | Amatoriale | 37 |
| SHV-FSH | 4. Liga | Amatoriale | 37 |
| SHV-FSH | SPL2 | Dilettantistico | 39 |

### Pallavolo

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Swiss Volley | NLB | Dilettantistico d'Élite | 41 |
| Swiss Volley | 1. Liga | Dilettantistico | 42 |
| Swiss Volley | 2. Liga | Amatoriale | 43 |
| Swiss Volley | 3. Liga | Amatoriale | 43 |
| Swiss Volley | 4. Liga | Amatoriale | 43 |
| Swiss Volley | 5. Liga | Amatoriale | 43 |

### Sci

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Swiss-Ski | Kantonalcup | Amatoriale | 46 |
| Swiss-Ski | Regionalrennen | Amatoriale | 46 |
| Swiss-Ski | Giovanili | Giovanile | 44, 45 |

### Biathlon

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Swiss-Ski | Giovanili | Giovanile | 47 |

### Tennis

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Swiss Tennis | NLB Interclub | Dilettantistico d'Élite | 49 |
| Swiss Tennis | 1. Liga Interclub | Amatoriale | 50 |
| Swiss Tennis | 2. Liga Interclub | Amatoriale | 50 |
| Swiss Tennis | 3. Liga Interclub | Amatoriale | 50 |

### Rugby

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| FSR | LNA | Dilettantistico d'Élite | 51 |
| FSR | LNB | Dilettantistico | 52 |
| FSR | LNC | Amatoriale | 53 |
| FSR | LND | Amatoriale | 53 |

### Futsal

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ASF-SFV | Swiss Futsal Premier League | Dilettantistico d'Élite | 54 |
| ASF-SFV | Swiss Futsal Second League | Dilettantistico | 55 |
| ASF-SFV | Ligue Régionale Futsal | Amatoriale | 56 |

### Calcio a 7

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| SFFS | Firmensport Fussball 7er | Amatoriale | 58 |

## 6. Esclusioni — non importare

| Riga originale | Sport | Voce esclusa | Motivo / stato | Dettaglio |
| --- | --- | --- | --- | --- |
| 5 | Calcio | Credit Suisse Super League | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 6 | Calcio | dieci Challenge League | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 7 | Calcio | Hoval Promotion League | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 12 | Calcio | AXA Women's Super League | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 13 | Calcio | Nationalliga B / Ligue Nationale B (NLB) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 15 | Hockey su Ghiaccio | National League (NL) | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 16 | Hockey su Ghiaccio | Swiss League (SL) | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 21 | Hockey su Ghiaccio | PostFinance Women's League | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 23 | Floorball / Unihockey | Unihockey Prime League (UPL) Herren | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 27 | Floorball / Unihockey | Unihockey Prime League (UPL) Damen | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 28 | Basket | Swiss Basketball League (SBL) Men | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 32 | Basket | SBL Women | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 34 | Pallamano | Quickline Handball League (QHL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 38 | Pallamano | SPAR Premium League 1 (SPL1) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 40 | Volley | PVL / NLA (Nationalliga A) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 48 | Tennis | NLA / LNA Interclub | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 44 | Sci | FIS Races (voce generica) | Esclusione parziale | Non è un singolo campionato dilettantistico. Mantenuto solo il settore giovanile BRACK Swiss Cup. |
| 47 | Sci di fondo / Biathlon | Swiss Cup senior / componente fondo non separata | Esclusione parziale | Mantenuti soltanto i Challenger giovanili del Biathlon. |

## 7. Implementazione coerente con l’Italia

- Paese canonico `CH`: filtrare Sport → Ente/Federazione → Categoria usando il contesto Paese esistente. Non ricavarlo dalla lingua, dalla cittadinanza o dal nome di una città; non duplicare il selettore Paese.
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

1. Riconciliare le **56 combinazioni** della sezione 5, senza duplicati, con le righe originali indicate. Nessuna voce esclusa deve essere disponibile nelle nuove selezioni.
2. Verificare isolamento per Paese e assenza di contaminazione con Italia, Francia, Spagna e gli altri Paesi. Le categorie omonime di sport/enti diversi devono restare distinte.
3. Verificare i **3 Giovanili**, i formati di calcio ridotti e le correzioni della sezione 4. Non creare categorie aggiuntive da alias o numeri di girone.
4. Verificare scelte dipendenti, combinazioni miste respinte lato server, più Iscrizioni, principale unica, ownership e conservazione delle Opportunity storiche.
5. Eseguire lint/typecheck e i test mirati disponibili nella repo. Verificare migrazioni/seed su ambiente locale se disponibile. Distinguere test eseguiti da quelli non eseguibili e riportare eventuali blocchi concreti.

## 9. Fonti e limiti

Fonte X: `Campionati_Dilettantistici_Svizzera.xlsx`, tre fogli letti. Le classificazioni non corrette esplicitamente sono dati della fonte utente, non certificazioni federali autonome. SHA-256 originale: `d27890ff956dca94933878a2a5d2460c98b6b2e157e85bad748a0be718c6eb77`.

| ID | Fonte | Che cosa è stato verificato |
| --- | --- | --- |
| C1 | [SIHF: MyHockey League](https://www.sihf.ch/de/ligen/myhockey-league/) | Pagina letta: terzo livello e massima lega amatoriale. Correzione della natura della riga 17; viene mantenuta. |
| C2 | [SIHF: leghe amatoriali](https://www.sihf.ch/de/ligen/amateurligen/) | Pagina consultata: ambito amatoriale dell’hockey. I nomi plurilingui della stessa lega restano alias. |
| C3 | [SIHF: leghe femminili](https://www.sihf.ch/de/ligen/frauenligen/) | Pagina letta: SWHL B, C e D appartengono al Breitensport femminile. B nazionale, C/D con gruppi regionali. |
| C4 | [Suisse Rugby: facts and figures](https://www.suisserugby.com/clubs-community-rugby/rugby-in-switzerland/introduction/) | Pagina letta: presenta il rugby svizzero come sport amatoriale. La LNA viene mantenuta anche se è una massima serie. |
| C5 | [Swiss-Ski: Nachwuchs sci alpino](https://www.swiss-ski.ch/ski-alpin/nachwuchs/) | Risultato ufficiale indicizzato collega BRACK Swiss Cup al vivaio. Apertura diretta non riuscita: si mantiene solo la componente giovanile, senza includere tutte le gare FIS. |
| C6 | [Swiss-Ski: Swiss Cup](https://www.swiss-ski.ch/events/swiss-cup/) | Risultato ufficiale indicizzato con calendario BRACK Swiss Cup 2025/26. Non utilizzato come prova di dilettantismo di tutte le gare FIS o delle Swiss Cup di altre discipline. |
| C7 | [Ski Romand: biathlon](https://ski-romand.ch/) | Fonte regionale indicizzata: Challenger U13/U15, distinta dalle attività senior. Conferma il settore giovanile della riga 47; il generico Swiss Cup di fondo/biathlon senior viene escluso dal perimetro. |
| C8 | [SFFS: calcio](https://www.firmensport.ch/aktivitaeten/fussball) | Pagina ufficiale consultata: nome SFFS, attività aziendale e ricreativa. La specifica etichetta 7er resta un dato dell’Excel, non una conferma federale di un campionato nazionale unico a 7. |
| C9 | [ASF-SFV](https://www.football.ch/) | Risultato ufficiale indicizzato: attività Junioren D-7/D-9 ed E. Non sono categorie di Calcio a 8. |
| C10 | [Swiss Basketball](https://swiss.basketball/) | Portale ufficiale indicizzato: NLB Men/Women e NL1 Men/Women. Per la riga 30 si normalizza la voce maschile in NL1 Men, senza aggiungere una categoria femminile assente dall’input. |

L’Excel filtrato conserva il foglio territoriale e la sintesi degli enti come documentazione. La vecchia colonna delle leghe professionistiche nella sintesi è sostituita dal perimetro selezionato, per non rimettere quelle leghe nel materiale di importazione. Eventuali informazioni territoriali storiche non vengono certificate da questa revisione.

## 10. Resoconto finale atteso

Elencare file modificati, conteggi importati per Paese/Sport/Ente, correzioni applicate, test eseguiti e passaggi locali eventualmente non disponibili. Distinguere implementazione da rilascio: nessuna migrazione remota o pubblicazione in produzione fa parte di questo incarico.
