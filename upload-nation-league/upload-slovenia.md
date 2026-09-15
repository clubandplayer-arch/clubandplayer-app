# Club and Player — Slovenia: dilettanti e giovanili

Revisione: 15 settembre 2026. Paese: `SI`. Percorso repo: `upload-nation-league/upload-slovenia.md`.

## 1. Incarico

Implementare il catalogo Slovenia nel repository web `clubandplayer-app`, sotto il contesto Paese Slovenia, riutilizzando il modello italiano delle Iscrizioni e le estensioni per Paese già presenti. Questo documento è autosufficiente: non serve l’Excel per l’importazione.

**Solo la sezione 5 è l’elenco di categorie da attivare.** Le esclusioni e le fonti sono documentazione e non devono diventare opzioni. Non usare i campionati professionistici elencati nell’audit per completare il catalogo.

## 2. Criterio di selezione

Richiesta: mantenere dilettanti, amatori e giovanili. Conservare le categorie dilettantistiche d’élite anche quando sono la massima serie di uno sport minore. Escludere le righe professionistiche e, per il perimetro iniziale prudente già usato per la Spagna, quelle semiprofessionistiche o miste, salvo correzioni federali esplicite riportate sotto.

Le verifiche ufficiali sono mirate alle ambiguità, agli organizzatori e alle principali correzioni. Dove non esiste una verifica separata, la natura dilettantistica deriva dalla colonna Natura del file utente. Non si certificano l’assenza di atleti retribuiti o tutti i contratti individuali. Non trasformare questa selezione in un badge «tutti dilettanti» o in un divieto di accesso per persone retribuite. La presenza di una lega in un sito federale conferma il nome o la struttura, non da sola il suo status economico.

Le voci non confermate sono sospese e identificate come tali: **sospeso non significa professionistico**. Non ampliare la lista chiusa senza nuovi dati. Non è necessario ripetere una ricerca generale per implementare le opzioni già definite.

## 3. Riconciliazione

| Misura | Conteggio |
| --- | --- |
| Righe originali Campionati e Categorie | 42 |
| Righe mantenute, comprese le porzioni ammesse | 27 |
| Righe interamente escluse o sospese | 15 |
| Categorie normalizzate da attivare | 30 |
| Sport / discipline selezionati | 14 |
| Enti / raggruppamenti applicativi distinti | 12 |
| Opzioni Giovanili dopo accorpamento | 2 |

I conteggi delle righe e delle categorie differiscono: una riga può contenere più categorie e più righe giovanili possono confluire in una sola opzione. Le righe citate nella sezione 5 si riferiscono all’Excel originale, prima del filtraggio.

## 4. Correzioni e interpretazioni vincolanti

- Calcio: 1. SNL e 2. SNL esclusi dal catalogo attivo. 3. SNL mantiene un’unica categoria, senza creare Est/Ovest come categorie distinte.
- 1. SML, 1. SKL e attività NZS U11/U9 confluiscono in una sola voce Calcio / NZS / Giovanili. Il calcio a 7 di base non viene attribuito al calcio a 8.
- Calcio a 7 / SMZ / Liga ENA: sostituzione operativa della riga 14 con nome e organizzatore verificati. Non effettuare una fusione automatica degli eventuali UUID storici LMN/SMNZ.
- PARKL e Rekreacijske lige sono mantenute come leghe locali. Usare il raggruppamento di organizzatori locali indicato sotto, senza affermare che PARKL sia gestita direttamente da KZS. Stesso criterio per Liga EHL / Mariborska liga.
- RZS della pallamano e RZS del rugby devono avere entità distinte. Usare RZS-Rugby come etichetta applicativa disambiguante, non come pretesa sigla ufficiale.
- Pallanuoto: mantenuta la prima serie come dilettantistica d’élite secondo l’input e una sola voce Giovanili. La prima serie di uno sport minore non è esclusa per il solo livello.
- Baseball e Softball diventano due sport. Flag Football mantiene il proprio formato nel modello esistente. Torneji di lacrosse resta un’opzione amatoriale generica.

### Enti di riferimento

| Label breve | Denominazione / significato |
| --- | --- |
| NZS | Nogometna zveza Slovenije |
| SMZ | Slovenska malonogometna zveza |
| KZS | Košarkarska zveza Slovenije |
| Organizzatori locali | Raggruppamento applicativo delle leghe locali indicate; non è una federazione |
| RZS | Rokometna zveza Slovenije |
| OZS | Odbojkarska zveza Slovenije |
| ZVDS | Zveza vaterpolskih društev Slovenije |
| ZHTS | Zveza za hokej na travi Slovenije |
| ZBSS | Zveza za baseball in softball Slovenije |
| ZANS | Zveza za ameriški nogomet Slovenije |
| RZS-Rugby | Rugby zveza Slovenije |
| Slovenia Lacrosse | Slovenia Lacrosse |

I nomi generici di leghe locali sono categorie ammesse quando già presenti nella fonte. «Organizzatori locali» è un raggruppamento applicativo, non il nome di una federazione ufficiale. Gli acronimi collettivi regionali vengono ricondotti all’ente nazionale di riferimento solo come struttura di catalogo, senza attribuirgli una gestione diretta non documentata.

## 5. Catalogo attivo — elenco chiuso

Ogni riga è una combinazione valida Paese + Sport + Ente + Categoria. Non fare prodotti cartesiani fra le colonne. Usare l’ordine di prima comparsa, con Giovanili in fondo al relativo gruppo. I riferimenti originali sono metadati di provenienza, non nuovi campi del form.

### Calcio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| NZS | 3. SNL | Dilettantistico d'Élite | 7 |
| NZS | Regionalna nogometna liga | Dilettantistico | 8 |
| NZS | Enotna primorska liga | Dilettantistico | 8 |
| NZS | 1. MNZ Liga | Amatoriale | 9 |
| NZS | 2. MNZ Liga | Amatoriale | 9 |
| NZS | Giovanili | Giovanile | 12, 13, 15 |

### Calcio a 7

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| SMZ | Liga ENA | Amatoriale | 14 |

### Futsal

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| NZS | 2. SFL | Dilettantistico | 17 |
| NZS | Območne futsal lige | Amatoriale | 18 |

### Pallacanestro

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| KZS | 3. SKL | Dilettantistico d'Élite | 21 |
| KZS | 4. SKL | Dilettantistico | 22 |
| Organizzatori locali | PARKL | Amatoriale | 24 |
| Organizzatori locali | Rekreacijske lige | Amatoriale | 24 |

### Pallamano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| RZS | 2. SRL | Dilettantistico d'Élite | 27 |

### Pallavolo

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| OZS | 2. DOL | Dilettantistico d'Élite | 31 |
| OZS | 3. DOL | Dilettantistico | 32 |
| OZS | Regijske odbojkarske lige | Amatoriale | 33 |

### Hockey su ghiaccio

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Organizzatori locali | Liga EHL | Amatoriale | 36 |
| Organizzatori locali | Mariborska liga | Amatoriale | 36 |

### Pallanuoto

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZVDS | 1. članska vaterpolska liga | Dilettantistico d'Élite | 37 |
| ZVDS | Giovanili | Giovanile | 38 |

### Hockey su prato

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZHTS | Državno prvenstvo v hokeju na travi | Dilettantistico | 39 |
| ZHTS | Dvoranski hokej | Dilettantistico | 40 |

### Baseball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZBSS | Slovenska baseball liga (SBL) | Dilettantistico | 41 |

### Softball

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZBSS | Slovenska softball liga | Dilettantistico | 42 |

### Football americano

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| ZANS | Državno prvenstvo v ameriškem nogometu | Dilettantistico d'Élite | 43 |
| ZANS | Slovenska Flag Football Liga (SFFL) | Dilettantistico | 44 |

### Rugby

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| RZS-Rugby | Državno prvenstvo v ragbiju | Dilettantistico | 45 |

### Lacrosse

| Ente / organizzatore | Categoria | Tipo selezionato | Righe originali |
| --- | --- | --- | --- |
| Slovenia Lacrosse | Slovenska lacrosse liga | Amatoriale | 46 |
| Slovenia Lacrosse | Torneji | Amatoriale | 46 |

## 6. Esclusioni — non importare

| Riga originale | Sport | Voce esclusa | Motivo / stato | Dettaglio |
| --- | --- | --- | --- | --- |
| 5 | Calcio | PrvaLiga Telemach (1. SNL) | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 6 | Calcio | 2. slovenska nogometna liga (2. SNL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 10 | Calcio | Ženska nogometna liga (1. SŽNL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 11 | Calcio | 2. Ženska nogometna liga (2. SŽNL) | Da verificare | Seconda serie femminile non confermata nel catalogo attuale NZS. La voce è sospesa per verifica di esistenza, non classificata professionistica. |
| 16 | Futsal | 1. slovenska futsal liga (1. SFL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 19 | Basket | Liga Nova KBM (1. SKL) | Professionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 20 | Basket | 2. slovenska košarkarska liga (2. SKL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 23 | Basket | 1. SKL za ženske | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 25 | Pallamano | Liga NLB (1. A SRL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 26 | Pallamano | 1. B državna rokometna liga (1. B SRL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 28 | Pallamano | 1. A državna rokometna liga za ženske | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 29 | Pallamano | 1. B SRL za ženske | Da verificare | La pagina RZS 2026/27 descrive una Enotna 1. SRL femminile con 12 club. La vecchia 1. B femminile non è confermata come seconda lega autonoma: sospesa. |
| 30 | Volley | Sportklub prva odbojkarska liga (1. DOL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 34 | Hockey su Ghiaccio | International Hockey League (IHL) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |
| 35 | Hockey su Ghiaccio | Državno prvenstvo Slovenije (DP) | Misto / semiprofessionistico | Natura indicata nell’Excel; esclusione dal perimetro iniziale dilettanti. |

## 7. Implementazione coerente con l’Italia

- Paese canonico `SI`: filtrare Sport → Ente/Federazione → Categoria usando il contesto Paese esistente. Non ricavarlo dalla lingua, dalla cittadinanza o dal nome di una città; non duplicare il selettore Paese.
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

1. Riconciliare le **30 combinazioni** della sezione 5, senza duplicati, con le righe originali indicate. Nessuna voce esclusa deve essere disponibile nelle nuove selezioni.
2. Verificare isolamento per Paese e assenza di contaminazione con Italia, Francia, Spagna e gli altri Paesi. Le categorie omonime di sport/enti diversi devono restare distinte.
3. Verificare i **2 Giovanili**, i formati di calcio ridotti e le correzioni della sezione 4. Non creare categorie aggiuntive da alias o numeri di girone.
4. Verificare scelte dipendenti, combinazioni miste respinte lato server, più Iscrizioni, principale unica, ownership e conservazione delle Opportunity storiche.
5. Eseguire lint/typecheck e i test mirati disponibili nella repo. Verificare migrazioni/seed su ambiente locale se disponibile. Distinguere test eseguiti da quelli non eseguibili e riportare eventuali blocchi concreti.

## 9. Fonti e limiti

Fonte X: `Campionati_Dilettantistici_Slovenia.xlsx`, tre fogli letti. Le classificazioni non corrette esplicitamente sono dati della fonte utente, non certificazioni federali autonome. SHA-256 originale: `2bfc8124c60c2cc29c0c8ea7fa96a8a05e61dfd2c1e80c0d5962306e42a17876`.

| ID | Fonte | Che cosa è stato verificato |
| --- | --- | --- |
| S1 | [NZS: competizioni club](https://www.nzs.si/klubi) | Elenco consultato: 3. SNL, SML/SKL e una lega femminile senior. Non compare una seconda serie femminile autonoma. La sua assenza è motivo di sospensione prudente, non dimostrazione che non sia mai esistita. |
| S2 | [RZS: 1. SRL femminile](https://www.rokometna-zveza.si/si/tekmovanja/1-a-drl-zenske) | Pagina consultata: per 2026/27 descrive una prima serie femminile unificata con 12 club. Non importare automaticamente la vecchia 1. B femminile come lega distinta. |
| S3 | [SMZ](https://smz.si/) | Pagina ufficiale consultata: sigla SMZ, organizzazione e bando Liga ENA 2026/27. Sostituisce il nome SMNZ e la vaga etichetta LMN del foglio. |
| S4 | [Regolamento Liga ENA pubblicato da SMZ](https://smz.si/wp-content/uploads/Razpis-in-pravilnik-Liga-ENA_sezona-2023-24.-1.pdf) | Regolamento 2023/24 letto, pagine 1 e 3: attività ricreativa e formato 6+1. È la versione linkata dal portale consultato; non si attestano qui tutte le condizioni sportive della stagione 2026/27. |
| S5 | [EMF: Slovenia](https://www.minifootball.eu/country/slovenia/) | Pagina ufficiale indicizzata: SMZ, leghe regionali e attività ricreativa. Non attribuisce tutto il minifootball sloveno al formato a 8. |

L’Excel filtrato conserva il foglio territoriale e la sintesi degli enti come documentazione. La vecchia colonna delle leghe professionistiche nella sintesi è sostituita dal perimetro selezionato, per non rimettere quelle leghe nel materiale di importazione. Eventuali informazioni territoriali storiche non vengono certificate da questa revisione.

## 10. Resoconto finale atteso

Elencare file modificati, conteggi importati per Paese/Sport/Ente, correzioni applicate, test eseguiti e passaggi locali eventualmente non disponibili. Distinguere implementazione da rilascio: nessuna migrazione remota o pubblicazione in produzione fa parte di questo incarico.
