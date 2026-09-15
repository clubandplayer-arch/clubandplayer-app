# Club and Player — Spagna: catalogo dilettantistico e istruzioni per Codex

Data della revisione: 15 settembre 2026.
Percorso previsto nel repository: `upload-nation-league/upload-spain.md`.

## 1. Incarico e risultato atteso

Leggi questo documento integralmente e implementa il catalogo Spagna qui selezionato nel repository web `clubandplayer-app`. Riusa il modello italiano delle Iscrizioni del Club e il filtro per Paese eventualmente già esteso alla Francia. Questo è un file unico e autosufficiente: l’Excel originale non è necessario per implementare il catalogo.

L’utente ha richiesto di estrarre dal file `Campionati_Dilettantistici_Spagna.xlsx` le categorie pertinenti a una piattaforma per sport dilettantistico, escludendo il segmento professionistico. In particolare, non vuole introdurre Primera e Segunda División maschili del calcio come opzioni per il mercato di riferimento iniziale.

La sezione 5 contiene l’elenco chiuso da rendere selezionabile. La sezione 6 documenta le esclusioni; l’appendice riconcilia tutte le righe dell’Excel. Non importare automaticamente le righe dell’appendice e non attivare le categorie escluse per raggiungere il conteggio originale.

## 2. Criterio di selezione e limiti della verifica

### Decisione operativa per questa prima versione

Si mantengono le righe classificate nell’Excel come dilettantistiche, dilettantistiche d’élite, amatoriali o giovanili, con le normalizzazioni esplicite della sezione 5. Si escludono dal catalogo attivo iniziale:

1. Le massime leghe professionistiche e la Segunda División maschile di calcio.
2. Le categorie con attività professionistica documentata, anche quando la competizione non è formalmente qualificata come lega professionistica.
3. Per un perimetro iniziale prudente, anche le categorie che il file descrive come semiprofessionistiche o miste. Queste ultime sono rinviate per scelta di prodotto: non vengono dichiarate giuridicamente professionistiche.

Il terzo criterio è la scelta editoriale esplicita fatta nella preparazione per interpretare la richiesta di concentrarsi sui dilettanti. È modificabile in una futura tranche senza dover ricostruire i dati esclusi. Non è una classificazione federale ufficiale e non significa che in quei campionati manchino atleti dilettanti.

### Distinzione verificata sulle fonti

Il BOE, nel contratto collettivo della Primera Federación, distingue la natura non professionistica della competizione dalle relazioni di lavoro professionistico dei suoi giocatori (S2, artt. 1–2). Perciò il semplice filtro “non è LaLiga” è insufficiente. Il grado del campionato, uno sponsor o il nome División de Honor non bastano per classificare uno sport.

Le fonti ufficiali raccolte verificano le principali esclusioni professionistiche e diversi nomi/strutture delle competizioni. Non tutte le federazioni pubblicano una separazione binaria amateur/pro: per i livelli inferiori e diversi sport minori, la natura riportata nell’Excel resta un dato della fonte utente, integrato dalla verifica della competizione, non una certificazione autonoma del rapporto di lavoro di ogni partecipante. La colonna Fonti indica il riferimento e la sezione 9 ne delimita esattamente il valore probatorio.

Il catalogo non deve visualizzare badge “tutti dilettanti”, non deve classificare contratti individuali e non deve impedire l’accesso a una persona perché retribuita. Si limita alle categorie sportive proposte nelle nuove Iscrizioni e Opportunity.

Una massima serie di uno sport minore non viene esclusa solo perché è il primo livello: restano, secondo il perimetro dell’input, le categorie di hockey, baseball, softball, football americano e lacrosse incluse sotto. Gli sport con fascia mista esplicitamente segnalata nel file sono trattati nella sezione 6.

## 3. Regole del modello comune Italia/Francia

### Paese e menu

- Usa `ES` per Spagna e la fonte canonica del Paese già presente nel prodotto. Non dedurre il Paese dalla lingua dell’interfaccia, dalla cittadinanza o dal nome di una città.
- Nel contesto Spagna mantieni il modulo **Sport → Ente/Federazione → Categoria/Campionato**. Riusa il selettore Paese esistente; non introdurre un secondo Paese ridondante.
- Mostra solo gli enti con almeno una categoria inclusa per ES + Sport; mostra le categorie dell’esatta combinazione ES + Sport + Ente, inclusi disciplina e variante pertinenti.
- Cambiare il contesto azzera solo le selezioni diventate incompatibili nel modulo. Non cancella o converte le iscrizioni già salvate.
- Valida Paese/Sport/Ente/Categoria nel client e nel server. Riusa relazioni e vincoli canonici per assicurare la coerenza anche nel database.
- Mantieni ordine italiano, dati francesi e fallback legacy. Non applicare l’elenco dei dodici enti italiani come whitelist globale.
- Questo documento riguarda solo la Spagna. Non applicare retroattivamente il filtro professionistico al catalogo Francia già preparato o all’Italia: un eventuale riallineamento è un intervento separato.

### Sport, label e Giovanili

- Riusa gli sport esistenti. Basket è alias di Pallacanestro/Basket; Volley di Pallavolo/Volley. Mantieni Calcio e Futsal distinti nelle scelte applicative e mappati correttamente a sport/disciplina/variante canonici e valori legacy.
- Baseball e Softball sono due sport applicativi separati; riusali senza creare lo sport aggregato dell’Excel.
- Non aggiungere Calcio a 8: nel file Spagna non sono fornite categorie per tale sport. Lo sport deve comunque restare nel catalogo generale se già esiste.
- Una sola categoria Giovanili per Paese + Sport applicativo + Ente dove l’input contiene attività giovanile: Calcio/RFEF, Rugby/RFER e Hockey su ghiaccio/RFEDH.
- Division de Honor Juvenil e Liga Nacional Juvenil confluiscono in Calcio/RFEF/Giovanili. Sub-23 del rugby confluisce in Rugby/RFER/Giovanili come scelta di semplificazione dell’app, non come classificazione anagrafica di minori. Sub-20/Sub-18/Sub-15 del ghiaccio confluiscono nella sola voce RFEDH/Giovanili.
- La label comune è `Giovanili` in italiano e `Categorías de formación` in spagnolo. Riusa le chiavi i18n comuni se esistenti, conservando la traduzione francese `Jeunes`. Non introdurre una categoria diversa per ciascuna traduzione.
- Le categorie senior maschili e femminili esplicite restano distinte. Non duplicare per genere le categorie generiche che non lo specificano.
- Nomi propri dei campionati in spagnolo, accenti preservati. Gli sport seguono l’i18n già implementato. Gli alias storici non sono categorie aggiuntive.

### Territoriali e informazioni escluse dal modulo

Le opzioni autonomiche, regionali, provinciali e locali sono selezionabili, come le opzioni generiche italiane. L’assenza della singola federazione territoriale nella label non è un motivo di rifiuto.

Le federazioni autonomiche rimangono articolazioni della federazione di riferimento nel catalogo di questa tranche, senza nuovi passaggi obbligatori. Il secondo foglio dell’Excel contiene etichette generiche come “Fútbol / Baloncesto / etc.”: non sono 19 identità di enti valide indistintamente per ogni sport e non devono essere importate come tali.

Non aggiungere alle Iscrizioni stagione, anno sportivo, girone, territorio, ranking o classificazione professionale. Non importare i numeri di livello dell’Excel come ranking: alcune strutture sono cambiate. Non effettuare importazioni di geografia o modifiche a `geo_areas`.

## 4. Enti selezionabili

Usa le label brevi e l’ordine relativo seguente, mediante `display_order` o equivalente. Il nome completo è interno. Questo è un ordine di visualizzazione, non un ordinamento alfabetico né una gerarchia sportiva.

| Ordine | Label | Nome completo | Sport di questa tranche |
| --- | --- | --- | --- |
| 1 | RFEF | Real Federación Española de Fútbol | Calcio, Futsal |
| 2 | FEB | Federación Española de Baloncesto | Pallacanestro |
| 3 | RFEBM | Real Federación Española de Balonmano | Pallamano |
| 4 | RFER | Real Federación Española de Rugby | Rugby |
| 5 | RFEVB | Real Federación Española de Voleibol | Pallavolo |
| 6 | RFEDH | Real Federación Española de Deportes de Hielo | Hockey su ghiaccio |
| 7 | RFEN | Real Federación Española de Natación | Pallanuoto |
| 8 | RFEH | Real Federación Española de Hockey | Hockey su prato |
| 9 | RFEBS | Real Federación Española de Béisbol y Sófbol | Baseball, Softball |
| 10 | FEFA | Federación Española de Fútbol Americano | Football americano |
| 11 | AEL | Asociación Española de Lacrosse | Lacrosse |

Non aggiungere LaLiga/LFP, Liga F, ACB, ASOBAL o LNFS come ulteriori enti selezionabili in questa tranche. Le competizioni incluse fanno riferimento alla federazione indicata sopra. Ciò esprime il contesto federale applicativo, non afferma che la federazione nazionale organizzi direttamente ogni campionato territoriale.

## 5. Elenco chiuso delle categorie da implementare

Solo le righe delle tabelle di questa sezione alimentano le nuove opzioni selezionabili. Tutte hanno Paese `ES`. L’ordine è locale al gruppo Sport + Ente, senza valore di ranking. Le righe sorgente sono quelle del primo foglio dell’Excel.

`Generica` e `Formazione` sono note documentali, non badge da aggiungere nell’app. Il riferimento S16 raggruppa S16a/S16b/S16c descritti nelle fonti.

### Calcio — RFEF

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Tercera Federación | 9 | Competizione | X, S4, S19 |
| 2 | División de Honor Autonómica | 10 | Generica | X, S4, S19 |
| 3 | Regional Preferente | 10 | Generica | X, S4, S19 |
| 4 | Primera Regional | 11 | Generica | X, S4, S19 |
| 5 | Segunda Regional | 11 | Generica | X, S4, S19 |
| 6 | Tercera Regional | 11 | Generica | X, S4, S19 |
| 7 | Segunda Federación Femenina | 14 | Competizione | X, S4, S19 |
| 8 | Tercera Federación Femenina | 15 | Competizione | X, S4, S19 |
| 9 | Giovanili | 16, 17 | Formazione | X, S4, S19 |

### Futsal — RFEF

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Segunda División B de Fútbol Sala | 20 | Competizione | X, S20 |
| 2 | Tercera División de Fútbol Sala | 21 | Competizione | X, S20 |
| 3 | Liga Regional de Fútbol Sala | 22 | Generica | X, S20 |
| 4 | Liga Provincial de Fútbol Sala | 22 | Generica | X, S20 |
| 5 | Segunda División Femenina de Fútbol Sala | 24 | Competizione | X, S20 |

### Pallacanestro — FEB

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Tercera FEB | 28 | Competizione | X, S7 |
| 2 | Liga Femenina 2 (LF2) | 31 | Competizione | X, S7 |
| 3 | Primera Nacional | 32 | Generica | X, S7 |
| 4 | Liga Autonómica | 32 | Generica | X, S7 |
| 5 | Senior Provincial | 33 | Generica | X, S7 |
| 6 | Senior Local | 33 | Generica | X, S7 |

### Pallamano — RFEBM

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Primera Nacional Masculina | 36 | Competizione | X, S10 |
| 2 | Segunda Nacional Masculina | 37 | Competizione | X, S10 |
| 3 | División de Honor Plata Femenina | 40 | Competizione | X, S10 |
| 4 | Primera Territorial | 41 | Generica | X, S10 |
| 5 | Segunda Territorial | 41 | Generica | X, S10 |

### Rugby — RFER

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | División de Honor B Masculina | 43 | Competizione | X, S11 |
| 2 | Giovanili | 44 | Formazione | X, S11 |
| 3 | División de Honor Femenina | 45 | Competizione | X, S11 |
| 4 | División de Honor B Femenina | 46 | Competizione | X, S11 |
| 5 | Primera Categoría Regional | 47 | Generica | X, S11 |
| 6 | Segunda Categoría Regional | 47 | Generica | X, S11 |

### Pallavolo — RFEVB

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Superliga Masculina 2 | 49 | Competizione | X, S12 |
| 2 | Primera División Masculina | 50 | Competizione | X, S12 |
| 3 | Superliga 2 Femenina | 52 | Competizione | X, S12 |
| 4 | Primera División Femenina | 53 | Competizione | X, S12 |
| 5 | Primera Autonómica | 54 | Generica | X, S12 |
| 6 | Segunda Autonómica | 54 | Generica | X, S12 |

### Hockey su ghiaccio — RFEDH

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Liga Nacional de Hockey Hielo (LNHH) | 55 | Competizione | X, S13 |
| 2 | Liga Senior Femenina | 56 | Competizione | X, S13 |
| 3 | Giovanili | 57 | Formazione | X, S13 |

### Pallanuoto — RFEN

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Primera División Masculina | 59 | Competizione | X, S14 |
| 2 | Segunda División Masculina | 60 | Competizione | X, S14 |
| 3 | Primera División Femenina | 62 | Competizione | X, S14 |
| 4 | Liga Autonómica | 63 | Generica | X, S14 |
| 5 | Liga Provincial | 63 | Generica | X, S14 |

### Hockey su prato — RFEH

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | División de Honor A Masculina | 64 | Competizione | X, S15 |
| 2 | División de Honor B Masculina | 65 | Competizione | X, S15 |
| 3 | Primera División Masculina | 66 | Competizione | X, S15 |
| 4 | División de Honor Femenina | 67 | Competizione | X, S15 |
| 5 | División de Honor B Femenina | 68 | Competizione | X, S15 |

### Baseball — RFEBS

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | División de Honor Oro (Béisbol) | 69 | Competizione | X, S16 |
| 2 | División de Honor Plata (Béisbol) | 70 | Competizione | X, S16 |
| 3 | Liga Regional | 72 | Generica | X, S16 |

### Softball — RFEBS

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | División de Honor Oro Femenina (Sófbol) | 71 | Competizione | X, S16 |
| 2 | Liga Regional | 72 | Generica | X, S16 |

### Football americano — FEFA

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | LNFA | 73 | Competizione | X, S17 |
| 2 | LNFA 2 | 74 | Competizione | X, S17 |
| 3 | LNFA Femenina | 75 | Competizione | X, S17 |
| 4 | Liga Regional (Serie C / Territoriales) | 76 | Generica | X, S17 |

### Lacrosse — AEL

| Ordine | Categoria/Campionato | Riga Excel | Tipo | Fonti |
| --- | --- | --- | --- | --- |
| 1 | Liga Española de Lacrosse (LEL) | 77 | Competizione | X, S18 |

### Correzioni e sostituzioni rispetto all’Excel

| Riga Excel | Trasformazione applicata |
| --- | --- |
| 9 | Tolto l’alias Tercera RFEF dalla label; usare Tercera Federación. |
| 10 | Separazione delle due opzioni territoriali; Autonómica disambigua División de Honor dalla massima serie di altri sport. |
| 11 | Tre opzioni regionali esplicitamente presenti nell’originale, senza assegnare un ranking nazionale uniforme. |
| 16 | Confluisce con riga 17 nella sola categoria Giovanili. |
| 17 | Confluisce con riga 16 nella sola categoria Giovanili. |
| 20 | Espansa l’abbreviazione FS. |
| 21 | Espansa l’abbreviazione FS. |
| 22 | Separate le opzioni regionali e provinciali; espansa FS. |
| 24 | Espansa l’abbreviazione FS. |
| 28 | Conservare ex Liga EBA come alias, non come categoria aggiuntiva. |
| 32 | Separate Primera Nacional e Liga Autonómica; non dedurre due generi da una voce priva di tale distinzione. |
| 33 | Separate le opzioni provinciali e locali. |
| 36 | Esplicitato Masculina dal contesto della colonna Livello. |
| 37 | Esplicitato Masculina dal contesto della colonna Livello. |
| 41 | Separate le due opzioni territoriali. |
| 43 | Esplicitato Masculina. Non importare il livello 2 dell’Excel: esiste una distinta Honor Élite. |
| 44 | Sub-23 confluisce in Giovanili per la regola applicativa comune: ciò non significa che tutti gli atleti siano minorenni. |
| 45 | Omissione dello sponsor; mantenuta la categoria femminile distinta. |
| 47 | Separate le categorie; corretto Categoriá in Categoría. |
| 49 | Ordine delle parole allineato al portale RFEVB. |
| 50 | Prima divisione di pallavolo secondo la label del portale RFEVB; alias Primera Nacional Masculina. |
| 53 | Prima divisione di pallavolo secondo la label del portale RFEVB; alias Primera Nacional Femenina. |
| 54 | Separate le due opzioni autonomiche. |
| 55 | Label descrittiva della LNHH, senza sponsor Loterías. |
| 57 | Tre fasce Under confluiscono in una sola categoria Giovanili. |
| 63 | Separate le opzioni autonomiche e provinciali. |
| 64 | Label descrittiva senza abbreviazione commerciale Liga DHM. |
| 65 | Esplicitato Masculina dalla colonna Livello. |
| 67 | Label descrittiva senza abbreviazione Liga DHF. |
| 69 | Denominazione corrente Oro documentata nella pagina federale 2026; SBL conservato come nome precedente nelle note. |
| 70 | Sostituzione della voce non aggiornata di secondo livello con l’attuale Honor Plata documentata da RFEBS. È una sostituzione di catalogo, non una equivalenza storica di UUID certificata. |
| 71 | Denominazione corrente Oro Femenina documentata dalle edizioni ufficiali; SSL conservato nelle note. |
| 72 | Una opzione Liga Regional per Baseball e una per Softball, con identità distinte. |
| 73 | Label LNFA corrente nel portale FEFA; Serie A rimane alias del testo ricevuto. |
| 74 | Label LNFA 2 presente nelle convocazioni FEFA 26/27; Serie B rimane riferimento del testo ricevuto, senza backfill automatico. |
| 77 | LEL conservata come voce generale fornita dall’utente; la pagina consultata conferma la lega senior maschile, non prova una identica struttura femminile. |

La sostituzione Baseball riga 70 non autorizza a rinominare record storici di Primera División già referenziati: se ne esistono, conservarli come storici/legacy e creare o riusare la categoria corrente Honor Plata soltanto dopo aver verificato le identità nel repository. Analogamente per Serie B/LNFA 2 e ogni altra ridenominazione. Le pagine federali correnti sono prova del nome corrente, non una licenza a unire entità storiche senza controllo.

Honor Élite nel rugby non è stato aggiunto: è una competizione distinta emersa nella verifica, assente dalle righe sorgente e fuori dall’estrazione iniziale prudente. Honor B rimane una categoria distinta e non assume il numero di livello scritto nell’Excel.

## 6. Categorie escluse dal catalogo attivo iniziale

Queste righe devono rimanere soltanto nella documentazione di audit. Non crearle come opzioni attive e non confondere “rinviata” con “lega ufficialmente professionistica”.

- **P:** segmento delle leghe professionistiche da escludere.
- **L:** attività professionistica documentata da fonti primarie sulle condizioni di lavoro, senza inferire necessariamente lo status formale della lega.
- **M:** natura mista/semiprofessionistica dichiarata nel file, esclusa per la scelta prudente di questa tranche. La natura non è stata certificata integralmente da fonti indipendenti.

| Riga | Sport | Categoria originale esclusa | Motivo | Classe | Fonti |
| --- | --- | --- | --- | --- | --- |
| 5 | Calcio | Primera División (LaLiga EA Sports) | Prima divisione professionistica maschile; fuori dal target richiesto. | P | S1 |
| 6 | Calcio | Segunda División (LaLiga Hypermotion) | Seconda divisione professionistica maschile; corrisponde al riferimento dell’utente alla Serie B spagnola. | P | S1 |
| 7 | Calcio | Primera Federación (Primera RFEF) | Il BOE documenta il lavoro professionistico nella categoria, pur qualificandola come competizione non professionistica. | L | S2 |
| 8 | Calcio | Segunda Federación (Segunda RFEF) | Natura mista Semi-Pro / Dilettantistico nel file: sospesa per il perimetro prudente, non dichiarata lega professionistica. | M | X |
| 12 | Calcio | Primera División Femenina (Liga F) | Massima serie femminile professionistica; non importare Liga F. | P | S3 |
| 13 | Calcio | Primera Federación Femenina | Semiprofessionistica nel file; esclusione di prodotto del secondo livello femminile, non equiparazione giuridica a Liga F. | M | X, S4 |
| 18 | Futsal | Primera División FS | Vertice futsal maschile; il contratto collettivo documenta giocatori professionisti in prima e seconda divisione. | L | S5 |
| 19 | Futsal | Segunda División FS | Secondo livello futsal maschile; attività professionistica documentata nel contratto collettivo, semiprofessionistico nel file. | L | S5 |
| 23 | Futsal | Primera División Femenina FS | Massima serie futsal femminile, indicata semiprofessionistica nel file; sospesa dal catalogo iniziale. | M | X |
| 25 | Basket | Liga Endesa (Liga ACB) | Liga ACB/Endesa: vertice professionistico maschile; fuori target. | P | X, S6 |
| 26 | Basket | Primera FEB (ex LEB Oro) | Prima FEB: il file indica Professionistico / Semi-Pro; non attivare nel catalogo dilettanti iniziale. | M | X, S7 |
| 27 | Basket | Segunda FEB (ex LEB Plata) | Seconda FEB: semiprofessionistica nel file; rinviata rispetto al primo livello incluso Tercera FEB. | M | X, S7 |
| 29 | Basket | Liga Femenina Endesa (LF Endesa) | LF Endesa: rapporto professionale documentato da FEB e contratto collettivo BOE. | L | S8 |
| 30 | Basket | LF Challenge | LF Challenge: semiprofessionistica nel file; primo livello femminile incluso LF2. | M | X, S7 |
| 34 | Pallamano | Liga ASOBAL (Liga Plenitude) | Liga ASOBAL: riconoscimento come lega professionistica documentato da LALIGA. | P | S9 |
| 35 | Pallamano | División de Honor Plata | Honor Plata maschile: semiprofessionistica nel file; primo livello incluso Primera Nacional. | M | X, S10 |
| 38 | Pallamano | Liga Guerreras Iberdrola (D.H. Femenina) | Massima serie pallamano femminile: Professionistico / Semi-Pro nel file; sospesa dal catalogo iniziale. | M | X, S10 |
| 39 | Pallamano | División de Honor Oro Femenina | Honor Oro femminile: semiprofessionistica nel file; primo livello incluso Honor Plata femminile. | M | X, S10 |
| 42 | Rugby | División de Honor | Rugby Honor maschile: natura mista Semi-Pro / Dilettantistico d’Élite nel file; esclusione prudente della massima serie. | M | X, S11 |
| 48 | Volley | Superliga Masculina (SVM) | Superliga maschile di volley: semiprofessionistica nel file; partenza applicativa dalla Superliga 2. | M | X, S12 |
| 51 | Volley | Superliga Femenina (SFV / Liga Iberdrola) | Superliga femminile di volley: semiprofessionistica nel file; partenza applicativa dalla Superliga 2. | M | X, S12 |
| 58 | Pallanuoto | Division de Honor Masculina | Honor maschile di pallanuoto: semiprofessionistica nel file; partenza dalla Primera División. | M | X, S14 |
| 61 | Pallanuoto | Division de Honor Femenina | Honor femminile di pallanuoto: semiprofessionistica nel file; partenza dalla Primera División. | M | X, S14 |

## 7. Implementazione nel repository

### Audit iniziale e riuso

1. Verifica repository web, branch, stato Git e istruzioni applicabili. Leggi l’implementazione italiana effettiva e l’eventuale estensione Francia. Non assumere che il contenuto di un documento sia già stato implementato o importato nel database.
2. Riusa cataloghi, endpoint, componenti, validazioni e modello delle iscrizioni multiple. Non creare tabelle Francia/Spagna separate, un catalogo concorrente o una singola affiliazione salvata direttamente sul profilo.
3. Se mancano le Iscrizioni multiple italiane, prepara quanto possibile del catalogo secondo le convenzioni esistenti e segnala il prerequisito concreto. Non inventare una seconda architettura e non dichiarare conclusa l’integrazione.
4. Implementa l’insieme selezionabile ES della sezione 5 attraverso il meccanismo canonico già esistente. Non usare filtri testuali come “escludi qualunque Primera” e non usare soltanto il contenuto non verificato della colonna Natura come logica runtime.

### Dati e compatibilità

- Identificatori stabili e chiavi univoche nel contesto Paese + Sport/Disciplina/Variante pertinente + Ente + Categoria. Non usare la label come identificatore globale.
- Seed/migration ripetibile senza duplicati e senza cambi di UUID a ogni riesecuzione. Riusa gli enti già esistenti se identici e appartenenti al giusto contesto.
- Aggiungi soltanto nuove migration, secondo le convenzioni del repository, se servono. Non riscrivere migration già applicate e non assumere lo stato di un database remoto.
- La whitelist ES governa le nuove scelte e le modifiche che cambiano categoria. Se ci sono record professionistici/storici ES già referenziati, non cancellarli né corrompere le loro relazioni: preservane lettura e contesto, impedendo che il nuovo catalogo li proponga automaticamente.
- Non fare backfill, conversioni automatiche dei profili o riscritture massive dei campi legacy. Il file Excel resta fonte documentale; non deve diventare un import automatico indiscriminato.
- Le API condivise devono restare compatibili con i client esistenti. Un fallback per parametro Paese assente non deve sovrascrivere `ES` esplicitamente selezionato.

### Iscrizioni, principale e Opportunity

- Il Club può avere più Iscrizioni, anche nello stesso sport con categorie differenti. Mantieni una sola principale attiva e il cambio atomico della principale.
- Riusa i vincoli anti-duplicazione della combinazione completa, la proprietà dei record, RLS e i privilegi minimi. Non utilizzare `service_role` per aggirare le autorizzazioni.
- Il modulo permette aggiunta, modifica e disattivazione; il profilo pubblico mostra le Iscrizioni attive, principale per prima. Testata e dati sportivi derivano dalla principale.
- Le Opportunity selezionano un’Iscrizione attiva del Club, preselezionando la principale e consentendo una secondaria. Il server verifica la proprietà e conserva i riferimenti canonici nell’Opportunity secondo il modello già adottato.
- Disattivare una Iscrizione non cancella o invalida il contesto di un’Opportunity pubblicata. Preserva il fallback legacy e la regola documentata di scelta della principale.
- Esempio di prova ES: Calcio · RFEF · Tercera Federación (principale), Calcio · RFEF · Giovanili, Futsal · RFEF · Tercera División de Fútbol Sala.

### Limiti operativi

Il lavoro è locale al repository web e ai test disponibili. Non accedere a Supabase remoto, non applicare migration remote, non pubblicare su Vercel e non distribuire in Production. Non modificare Mobile, Player, Staff, Fan, Institution o le esperienze in questa tranche. Non fare push, merge, force push, reset o amend dei commit precedenti senza un’istruzione successiva esplicita dell’utente.

Non ripetere una ricerca generale dei campionati e non chiedere all’utente di ricomporre dati già presenti qui. Le categorie attive sono definite nella sezione 5; i limiti documentali sulle classificazioni individuali non sono un blocco all’implementazione di tale scelta di prodotto.

## 8. Verifiche e consegna di Codex

Usa test data-driven per verificare la matrice esatta della sezione 5, i conteggi sotto e l’assenza dal catalogo selezionabile delle categorie della sezione 6. Verifica inoltre:

- filtro ES e isolamento da IT/FR, ordine stabile e reset dei valori incompatibili;
- una sola Giovanili per ciascuno dei tre contesti autorizzati, traduzione italiana/spagnola e nessuna voce Under separata;
- riuso degli sport esistenti, separazione Baseball/Softball, nessuna associazione inventata per Calcio a 8;
- validazione server-side delle combinazioni miste Paese/Sport/Ente/Categoria;
- iscrizioni multiple, duplicati, principale atomica, proprietà e RLS;
- salvataggio e rilettura dopo refresh, profilo pubblico e Opportunity legate alla principale o a una secondaria;
- conservazione delle Opportunity dopo la disattivazione e dei record legacy/storici già referenziati;
- regressione mirata Italia e Francia, compatibilità dei client e ripetibilità del seed/migration locale.

Esegui lint, typecheck, test pertinenti e `git diff --check` secondo gli script del repository. Replay locale delle migration se disponibile; dichiarare gli eventuali controlli non eseguiti senza attribuire un PASS fittizio. Non connetterti a database remoti per eseguire queste verifiche.

Consegna riepilogo dei file modificati, schema/API riutilizzati, matrice effettivamente implementata, verifiche eseguite e limiti. Specifica che il catalogo è un perimetro di prodotto per i dilettanti, non una certificazione del contratto di ogni atleta, e che nessuna migration remota o pubblicazione è stata eseguita.

### Conteggi di riconciliazione

- Righe originali: **73** (righe 5–77 del primo foglio).
- Righe escluse: **23** (5 P, 4 L, 14 M).
- Righe sorgente utilizzate: **50**.
- Opzioni finali dopo separazioni e accorpamenti Giovanili: **60**.
- Sport applicativi con categorie: **13**.
- Enti selezionabili: **11**.
- Categorie uniche Giovanili: **3**.

| Sport | Ente | Categorie finali |
| --- | --- | --- |
| Calcio | RFEF | 9 |
| Futsal | RFEF | 5 |
| Pallacanestro | FEB | 6 |
| Pallamano | RFEBM | 5 |
| Rugby | RFER | 6 |
| Pallavolo | RFEVB | 6 |
| Hockey su ghiaccio | RFEDH | 3 |
| Pallanuoto | RFEN | 5 |
| Hockey su prato | RFEH | 5 |
| Baseball | RFEBS | 3 |
| Softball | RFEBS | 2 |
| Football americano | FEFA | 4 |
| Lacrosse | AEL | 1 |

## 9. Fonti e ambito della verifica

**X — Fonte utente:** `Campionati_Dilettantistici_Spagna.xlsx`, foglio Campionati e Categorie, righe 5–77. Le colonne originali includono Natura e Note, ma non una stagione o fonti citate. Le due appendici territoriali/governance dell’Excel sono contesto e non cataloghi di identità sportive verificati.

Le fonti seguenti sono state consultate il 15 settembre 2026. Le fonti storiche documentano il fatto indicato, non garantiscono la vigenza di ogni dettaglio nel 2026. I risultati solo indicizzati sono distinti dalle pagine lette. Nessuna fonte sui nomi di una competizione prova, da sola, che tutti i suoi giocatori siano dilettanti.

- **S1 — [LALIGA — Convenios](https://www.laliga.com/transparencia/convenio-y-contratos/convenio)**. Letta pagina ufficiale. Documenta il contratto collettivo del calcio professionistico di Primera e Segunda División A; supporta le esclusioni 5 e 6.
- **S2 — [BOE-A-2024-8956 — Convenio Primera Federación](https://www.boe.es/buscar/doc.php?id=BOE-A-2024-8956)**. Letti artt. 1–2: lavoro professionistico nella Primera Federación, descritta dal testo stesso come categoria non professionistica. Supporta la distinzione tra status della lega e attività dei giocatori, senza qualificare automaticamente tutti i livelli inferiori.
- **S3 — [CSD — El CSD aprueba la profesionalización del fútbol femenino (15/06/2021)](https://www.csd.gob.es/)**. Risultato indicizzato della fonte ufficiale: professionalizzazione della massima serie femminile. Il recupero del permalink non è riuscito; il collegamento è al sito editore, non è prova di tutti gli altri livelli femminili.
- **S4 — [RFEF — Fechas clave fútbol femenino 2026/27](https://rfef.es/es/noticias/repasa-las-fechas-clave-del-futbol-femenino-para-la-temporada-202627)**. Pagina ufficiale recuperata: distingue Liga F, Primera, Segunda e Tercera Federación femminili. Verifica i nomi e la struttura; non certifica lo status lavorativo di tutte le atlete.
- **S5 — [BOE-A-2017-3758 — Convenio fútbol sala](https://www.boe.es/buscar/doc.php?id=BOE-A-2017-3758)**. Letti articolo preliminare e artt. 1–2: attività professionistica nei club LNFS di prima e seconda divisione. È una fonte storica; non viene attestata qui la vigenza nel 2026 di ogni clausola salariale.
- **S6 — [ACB — Portale ufficiale e informazione istituzionale](https://www.acb.com/)**. Risultati e informazione istituzionale ACB consultati; il file ricevuto identifica Liga ACB/Endesa come professionistica. Non usare questo riferimento per classificare le competizioni FEB inferiori.
- **S7 — [FEB — Catalogo ufficiale competizioni](https://www.feb.es/)**. Portale ufficiale recuperato con Primera FEB, Segunda FEB, Tercera FEB, LF Endesa, LF Challenge e LF2. Conferma le denominazioni; la distinzione operativa semi/dilettanti dei livelli inferiori deriva dal file ricevuto, non da una certificazione della FEB.
- **S8 — [FEB — Convenio LF Endesa (30/11/2023)](https://www.feb.es/lfendesa/2023/11/30/baloncesto/clubes-jugadoras-firman-acuerdo-del-nuevo-convenio-colectivo-endesa/96489.aspx)**. Pagina letta: accordo collettivo sulle condizioni di lavoro delle giocatrici. Conferma la componente professionale della massima serie; non estenderla a LF2.
- **S9 — [LALIGA — Accordo con Liga Profesional ASOBAL (30/08/2023)](https://www.laliga.com/noticias/laliga-y-la-liga-profesional-asobal-ponen-en-marcha-su-acuerdo-de-asesoramiento)**. Comunicato primario: ratifica del CSD della prima competizione maschile ASOBAL come lega professionistica. Non estendere il riconoscimento a tutta la pallamano.
- **S10 — [RFEBM — Portale competizioni e notizie](https://www.rfebm.com/)**. Pagina recuperata: separa ASOBAL, Honor Plata maschile, Primera Nacional e Liga Guerreras Iberdrola. Le etichette semi/dilettanti degli altri livelli sono quelle del file originale e una scelta di perimetro, non una conclusione giuridica.
- **S11 — [RFER — Risultati ufficiali rugby](https://resultadosrugby.isquad.es/)**. Risultato indicizzato del portale federale: Honor Élite e Honor B sono competizioni distinte. La pagina RFER sulle competizioni nazionali conferma l’introduzione di Honor Élite nel 2025. Non utilizzare i vecchi ordinali del foglio.
- **S12 — [RFEVB — Portale ufficiale competizioni](https://esvoley.es/)**. Pagina letta: Superliga, Superliga 2 e Primera División maschili/femminili. Verifica delle label. L’esclusione delle due massime serie come segmento semi è una scelta prudente basata sulla natura indicata nell’Excel.
- **S13 — [RFEDH — Hockey Hielo](https://www.rfedh.es/category/hockey-hielo/)**. Pagina letta con riferimenti alla LNHH e attività maschile/femminile. Conferma il contesto federale, non l’assenza di atleti remunerati; mantenimento delle categorie dilettantistiche secondo l’input.
- **S14 — [RFEN — Competiciones waterpolo](https://rfen.es/especialidades/waterpolo/competiciones/)**. Portale recuperato: Honor, Primera e Segunda sono livelli distinti. I livelli inferiori selezionati sono nel file originale; nessun automatismo che consideri Primera División professionistica in ogni sport.
- **S15 — [RFEH — División de Honor B masculina](https://historico.rfeh.es/competiciones/division-de-honor-masculina-b/)**. Portale federale storico consultato tramite indicizzazione, insieme a Honor A e Honor Femenina. Conferma denominazioni, non una certificazione attuale del dilettantismo di ogni atleta.
- **S16a — [RFEBS — Liga Nacional de Béisbol División de Honor Oro 2026](https://www.rfebs.es/es/events/2026-liga-nacional-de-beisbol-division-de-honor-oro-2026/editions)**. Denominazione nelle pagine federali indicizzate. Apertura diretta restituisce 403: il nome è supportato dal risultato di ricerca, non da regolamento integralmente letto.
- **S16b — [RFEBS — Liga Nacional Béisbol División Honor Plata 2026](https://www.rfebs.es/es/events/2026-liga-nacional-beisbol-division-honor-plata-2026/home)**. Denominazione nelle pagine federali indicizzate; apertura diretta 403. Sostituisce operativamente la vecchia voce di secondo livello del foglio; non dimostra una equivalenza storica automatica con tutte le edizioni di Primera División.
- **S16c — [RFEBS — Edizioni Spanish Softball League](https://www.rfebs.es/es/events/2024-spanish-softball-league/editions)**. Il risultato indicizzato elenca per il 2026 Liga Nacional de Sófbol Femenino División de Honor Oro. Apertura diretta 403. Supporta l’aggiornamento del nome, non la classificazione contrattuale delle giocatrici.
- **S17 — [FEFA — Descargas fútbol americano](https://www.fefa.es/descargas-futbol-americano/)**. Risultato ufficiale indicizzato con convocazioni LNFA Femenina e LNFA 2 26/27; il portale Dónde jugar elenca anche LNFA. L’apertura diretta non è riuscita. Supporta le label, non lo status individuale degli atleti.
- **S18 — [AEL — Liga senior masculina](https://spainlacrosse.org/liga-senior/)**. Pagina ufficiale letta: conferma Liga Española de Lacrosse senior maschile. Non è una fonte per una identica competizione femminile; la voce generale LEL è mantenuta dall’input senza aggiungere generi.
- **S19 — [RFEF — Ayudas Tercera Federación 2026/27](https://rfef.es/es/node/112821)**. Pagina ufficiale letta che conferma la categoria corrente. Il sostegno federale non è, da solo, una prova del dilettantismo di tutti i giocatori.
- **S20 — [RFEF — Portale calcio e fútbol sala](https://rfef.es/)**. Portale recuperato con sezioni fútbol sala e categorie nazionali. La selezione Segunda B, Tercera e territoriali riprende il perimetro dilettantistico del file, senza attribuire professionismo in base al solo nome Primera/Segunda.

## Appendice A. Audit di tutte le righe originali

Solo documentazione, non dati da importare. La decisione per ogni riga è esplicita. La natura riportata è quella dell’Excel, senza spacciarla per una verifica esterna autonoma.

| Riga | Sport originale | Categoria originale | Natura nel file | Decisione | Destinazione attiva / motivo |
| --- | --- | --- | --- | --- | --- |
| 5 | Calcio | Primera División (LaLiga EA Sports) | Professionistico | Esclusa P | Prima divisione professionistica maschile; fuori dal target richiesto. |
| 6 | Calcio | Segunda División (LaLiga Hypermotion) | Professionistico | Esclusa P | Seconda divisione professionistica maschile; corrisponde al riferimento dell’utente alla Serie B spagnola. |
| 7 | Calcio | Primera Federación (Primera RFEF) | Semi-Professionistico | Esclusa L | Il BOE documenta il lavoro professionistico nella categoria, pur qualificandola come competizione non professionistica. |
| 8 | Calcio | Segunda Federación (Segunda RFEF) | Semi-Pro / Dilettantistico | Esclusa M | Natura mista Semi-Pro / Dilettantistico nel file: sospesa per il perimetro prudente, non dichiarata lega professionistica. |
| 9 | Calcio | Tercera Federación (Tercera RFEF) | Dilettantistico | Inclusa | Calcio / RFEF / Tercera Federación |
| 10 | Calcio | División de Honor / Regional Preferente | Dilettantistico | Inclusa | Calcio / RFEF / División de Honor Autonómica; Calcio / RFEF / Regional Preferente |
| 11 | Calcio | Primera / Segunda / Tercera Regional | Amatoriale | Inclusa | Calcio / RFEF / Primera Regional; Calcio / RFEF / Segunda Regional; Calcio / RFEF / Tercera Regional |
| 12 | Calcio | Primera División Femenina (Liga F) | Professionistico | Esclusa P | Massima serie femminile professionistica; non importare Liga F. |
| 13 | Calcio | Primera Federación Femenina | Semi-Professionistico | Esclusa M | Semiprofessionistica nel file; esclusione di prodotto del secondo livello femminile, non equiparazione giuridica a Liga F. |
| 14 | Calcio | Segunda Federación Femenina | Dilettantistico d'Élite | Inclusa | Calcio / RFEF / Segunda Federación Femenina |
| 15 | Calcio | Tercera Federación Femenina | Dilettantistico | Inclusa | Calcio / RFEF / Tercera Federación Femenina |
| 16 | Calcio | División de Honor Juvenil | Dilettantistico / Giovanile | Inclusa | Calcio / RFEF / Giovanili |
| 17 | Calcio | Liga Nacional Juvenil | Dilettantistico / Giovanile | Inclusa | Calcio / RFEF / Giovanili |
| 18 | Futsal | Primera División FS | Professionistico | Esclusa L | Vertice futsal maschile; il contratto collettivo documenta giocatori professionisti in prima e seconda divisione. |
| 19 | Futsal | Segunda División FS | Semi-Professionistico | Esclusa L | Secondo livello futsal maschile; attività professionistica documentata nel contratto collettivo, semiprofessionistico nel file. |
| 20 | Futsal | Segunda División B FS | Dilettantistico d'Élite | Inclusa | Futsal / RFEF / Segunda División B de Fútbol Sala |
| 21 | Futsal | Tercera División FS | Dilettantistico | Inclusa | Futsal / RFEF / Tercera División de Fútbol Sala |
| 22 | Futsal | Liga Regional / Provincial FS | Amatoriale | Inclusa | Futsal / RFEF / Liga Regional de Fútbol Sala; Futsal / RFEF / Liga Provincial de Fútbol Sala |
| 23 | Futsal | Primera División Femenina FS | Semi-Professionistico | Esclusa M | Massima serie futsal femminile, indicata semiprofessionistica nel file; sospesa dal catalogo iniziale. |
| 24 | Futsal | Segunda División Femenina FS | Dilettantistico | Inclusa | Futsal / RFEF / Segunda División Femenina de Fútbol Sala |
| 25 | Basket | Liga Endesa (Liga ACB) | Professionistico | Esclusa P | Liga ACB/Endesa: vertice professionistico maschile; fuori target. |
| 26 | Basket | Primera FEB (ex LEB Oro) | Professionistico / Semi-Pro | Esclusa M | Prima FEB: il file indica Professionistico / Semi-Pro; non attivare nel catalogo dilettanti iniziale. |
| 27 | Basket | Segunda FEB (ex LEB Plata) | Semi-Professionistico | Esclusa M | Seconda FEB: semiprofessionistica nel file; rinviata rispetto al primo livello incluso Tercera FEB. |
| 28 | Basket | Tercera FEB (ex Liga EBA) | Dilettantistico d'Élite | Inclusa | Pallacanestro / FEB / Tercera FEB |
| 29 | Basket | Liga Femenina Endesa (LF Endesa) | Professionistico | Esclusa L | LF Endesa: rapporto professionale documentato da FEB e contratto collettivo BOE. |
| 30 | Basket | LF Challenge | Semi-Professionistico | Esclusa M | LF Challenge: semiprofessionistica nel file; primo livello femminile incluso LF2. |
| 31 | Basket | Liga Femenina 2 (LF2) | Dilettantistico d'Élite | Inclusa | Pallacanestro / FEB / Liga Femenina 2 (LF2) |
| 32 | Basket | Primera Nacional / Liga Autonómica | Dilettantistico | Inclusa | Pallacanestro / FEB / Primera Nacional; Pallacanestro / FEB / Liga Autonómica |
| 33 | Basket | Senior Provincial / Local | Amatoriale | Inclusa | Pallacanestro / FEB / Senior Provincial; Pallacanestro / FEB / Senior Local |
| 34 | Pallamano | Liga ASOBAL (Liga Plenitude) | Professionistico | Esclusa P | Liga ASOBAL: riconoscimento come lega professionistica documentato da LALIGA. |
| 35 | Pallamano | División de Honor Plata | Semi-Professionistico | Esclusa M | Honor Plata maschile: semiprofessionistica nel file; primo livello incluso Primera Nacional. |
| 36 | Pallamano | Primera Nacional | Dilettantistico d'Élite | Inclusa | Pallamano / RFEBM / Primera Nacional Masculina |
| 37 | Pallamano | Segunda Nacional | Dilettantistico | Inclusa | Pallamano / RFEBM / Segunda Nacional Masculina |
| 38 | Pallamano | Liga Guerreras Iberdrola (D.H. Femenina) | Professionistico / Semi-Pro | Esclusa M | Massima serie pallamano femminile: Professionistico / Semi-Pro nel file; sospesa dal catalogo iniziale. |
| 39 | Pallamano | División de Honor Oro Femenina | Semi-Professionistico | Esclusa M | Honor Oro femminile: semiprofessionistica nel file; primo livello incluso Honor Plata femminile. |
| 40 | Pallamano | División de Honor Plata Femenina | Dilettantistico d'Élite | Inclusa | Pallamano / RFEBM / División de Honor Plata Femenina |
| 41 | Pallamano | Primera / Segunda Territorial | Amatoriale | Inclusa | Pallamano / RFEBM / Primera Territorial; Pallamano / RFEBM / Segunda Territorial |
| 42 | Rugby | División de Honor | Semi-Pro / Dilettantistico d'Élite | Esclusa M | Rugby Honor maschile: natura mista Semi-Pro / Dilettantistico d’Élite nel file; esclusione prudente della massima serie. |
| 43 | Rugby | División de Honor B | Dilettantistico d'Élite | Inclusa | Rugby / RFER / División de Honor B Masculina |
| 44 | Rugby | Liga Nacional Sub-23 | Dilettantistico | Inclusa | Rugby / RFER / Giovanili |
| 45 | Rugby | División de Honor Femenina (Liga Iberdrola) | Dilettantistico d'Élite | Inclusa | Rugby / RFER / División de Honor Femenina |
| 46 | Rugby | División de Honor B Femenina | Dilettantistico | Inclusa | Rugby / RFER / División de Honor B Femenina |
| 47 | Rugby | Primera / Segunda Categoriá Regional | Amatoriale | Inclusa | Rugby / RFER / Primera Categoría Regional; Rugby / RFER / Segunda Categoría Regional |
| 48 | Volley | Superliga Masculina (SVM) | Semi-Professionistico | Esclusa M | Superliga maschile di volley: semiprofessionistica nel file; partenza applicativa dalla Superliga 2. |
| 49 | Volley | Superliga 2 Masculina (SM2) | Dilettantistico d'Élite | Inclusa | Pallavolo / RFEVB / Superliga Masculina 2 |
| 50 | Volley | Primera Nacional Masculina | Dilettantistico | Inclusa | Pallavolo / RFEVB / Primera División Masculina |
| 51 | Volley | Superliga Femenina (SFV / Liga Iberdrola) | Semi-Professionistico | Esclusa M | Superliga femminile di volley: semiprofessionistica nel file; partenza applicativa dalla Superliga 2. |
| 52 | Volley | Superliga 2 Femenina (SF2) | Dilettantistico d'Élite | Inclusa | Pallavolo / RFEVB / Superliga 2 Femenina |
| 53 | Volley | Primera Nacional Femenina | Dilettantistico | Inclusa | Pallavolo / RFEVB / Primera División Femenina |
| 54 | Volley | Primera / Segunda Autonómica | Amatoriale | Inclusa | Pallavolo / RFEVB / Primera Autonómica; Pallavolo / RFEVB / Segunda Autonómica |
| 55 | Hockey su Ghiaccio | Liga LNHH Loterías (Liga Senior) | Dilettantistico d'Élite | Inclusa | Hockey su ghiaccio / RFEDH / Liga Nacional de Hockey Hielo (LNHH) |
| 56 | Hockey su Ghiaccio | Liga Senior Femenina | Dilettantistico | Inclusa | Hockey su ghiaccio / RFEDH / Liga Senior Femenina |
| 57 | Hockey su Ghiaccio | Liga Sub-20 / Sub-18 / Sub-15 | Dilettantistico / Giovanile | Inclusa | Hockey su ghiaccio / RFEDH / Giovanili |
| 58 | Pallanuoto | Division de Honor Masculina | Semi-Professionistico | Esclusa M | Honor maschile di pallanuoto: semiprofessionistica nel file; partenza dalla Primera División. |
| 59 | Pallanuoto | Primera División Masculina | Dilettantistico d'Élite | Inclusa | Pallanuoto / RFEN / Primera División Masculina |
| 60 | Pallanuoto | Segunda División Masculina | Dilettantistico | Inclusa | Pallanuoto / RFEN / Segunda División Masculina |
| 61 | Pallanuoto | Division de Honor Femenina | Semi-Professionistico | Esclusa M | Honor femminile di pallanuoto: semiprofessionistica nel file; partenza dalla Primera División. |
| 62 | Pallanuoto | Primera División Femenina | Dilettantistico | Inclusa | Pallanuoto / RFEN / Primera División Femenina |
| 63 | Pallanuoto | Liga Autonómica / Provincial | Amatoriale | Inclusa | Pallanuoto / RFEN / Liga Autonómica; Pallanuoto / RFEN / Liga Provincial |
| 64 | Hockey su Prato | Liga DHM (División de Honor A) | Dilettantistico d'Élite | Inclusa | Hockey su prato / RFEH / División de Honor A Masculina |
| 65 | Hockey su Prato | División de Honor B | Dilettantistico | Inclusa | Hockey su prato / RFEH / División de Honor B Masculina |
| 66 | Hockey su Prato | Primera División Masculina | Dilettantistico | Inclusa | Hockey su prato / RFEH / Primera División Masculina |
| 67 | Hockey su Prato | Liga DHF (División de Honor Femenina) | Dilettantistico d'Élite | Inclusa | Hockey su prato / RFEH / División de Honor Femenina |
| 68 | Hockey su Prato | División de Honor B Femenina | Dilettantistico | Inclusa | Hockey su prato / RFEH / División de Honor B Femenina |
| 69 | Baseball e Softball | Spanish Baseball League (Div. de Honor) | Dilettantistico d'Élite | Inclusa | Baseball / RFEBS / División de Honor Oro (Béisbol) |
| 70 | Baseball e Softball | Primera División Nacional (Béisbol) | Dilettantistico | Inclusa | Baseball / RFEBS / División de Honor Plata (Béisbol) |
| 71 | Baseball e Softball | Spanish Softball League (Div. de Honor) | Dilettantistico d'Élite | Inclusa | Softball / RFEBS / División de Honor Oro Femenina (Sófbol) |
| 72 | Baseball e Softball | Liga Regional | Amatoriale | Inclusa | Baseball / RFEBS / Liga Regional; Softball / RFEBS / Liga Regional |
| 73 | Football Americano | LNFA Serie A | Dilettantistico d'Élite | Inclusa | Football americano / FEFA / LNFA |
| 74 | Football Americano | LNFA Serie B | Dilettantistico | Inclusa | Football americano / FEFA / LNFA 2 |
| 75 | Football Americano | LNFA Femenina | Dilettantistico | Inclusa | Football americano / FEFA / LNFA Femenina |
| 76 | Football Americano | Liga Regional (Serie C / Territoriales) | Amatoriale | Inclusa | Football americano / FEFA / Liga Regional (Serie C / Territoriales) |
| 77 | Lacrosse | Liga Española de Lacrosse (LEL) | Amatoriale | Inclusa | Lacrosse / AEL / Liga Española de Lacrosse (LEL) |

## Appendice B. Provenienza e copertura

Questa estrazione non pretende di elencare ogni campionato dilettantistico esistente in Spagna. Copre i dati forniti dall’utente e le correzioni esplicite documentate, senza aggiungere tutte le categorie assenti che possono emergere dalle fonti.

I fogli Struttura Autonomica (19 Fed.) e Sintesi Federazioni sono stati letti, ma non producono nuovi campionati, geografie o enti territoriali nel database. Il numero di 19 territori dell’Excel non è la prova dell’esistenza di 19 federazioni per ciascuno sport.

Non usare l’assenza di una categoria nella whitelist per modificare o eliminare profili esistenti. Questo incarico riguarda le nuove opzioni proposte per la Spagna.

SHA-256 Excel sorgente: `503dca4de705d9c08287e25de0bec84b9e3d252addb53492d6edbda6bb44f47c`.
