# FASE 5D-E-R-ES — Ricerca documentale per i selettori sportivi della Spagna

Data ricerca: 2026-09-07
Paese: **Spagna (ES)**
Stato: **PRIMA RICOGNIZIONE COMPLETATA CON COPERTURA PARZIALE DICHIARATA — REVIEW UMANA RICHIESTA**
Perimetro: i 14 valori di `SPORTS` esposti dall'app; priorità ai campionati senior dilettantistici, principali giovani nazionali e struttura territoriale senza censire i gironi.

## 1. Continuità e metodo

Il metodo Francia è approvato come ricognizione iniziale, non come certificazione delle singole denominazioni. Le lacune francesi restano registrate nel relativo documento e non sono state riaperte. Questa tranche conserva foundation, categorie italiane e contratto 5B; non propone dati da importare.

Sono separate:

- **verificata nel contenuto**: pagina, portale, calendario o regolamento ufficiale accessibile con la denominazione;
- **fonte ufficiale da ricontrollare**: URL/risultato ufficiale individuato, ma accesso automatico incompleto o denominazione stagionale non sufficientemente confermata;
- **lacuna**: informazione non trovata o non verificata, mai interpretata come inesistente.

Le coppe sono annotate soltanto come gap e restano fuori dal primo elenco selector. I nomi ufficiali rimangono in spagnolo. L'assenza di API, licenza o stable ID non impedisce la ricerca documentale, ma continua a bloccare manifest/seed/import automatici.

Il controllo automatizzato dei 44 URL ufficiali unici citati ha ottenuto 27 risposte `200`, 11 `403` anti-automazione e 6 risposte temporaneamente non disponibili/da ricontrollare. Un blocco HTTP non viene trasformato in “fonte inesistente”: le voci interessate rimangono esplicitamente parziali e soggette a review manuale.

## 2. Organizzatori e articolazioni

| Sport UI | Organizzatore nazionale / circuito verificato | Articolazione territoriale |
| --- | --- | --- |
| Calcio, Calcio a 8, Futsal | Real Federación Española de Fútbol (**RFEF**); Liga F e LALIGA per boundary professionale | Federaciones Territoriales RFEF |
| Volley | Real Federación Española de Voleibol (**RFEVB**) | federaciones autonómicas |
| Basket | Federación Española de Baloncesto (**FEB**); ACB per Liga Endesa | federaciones autonómicas e provinciali |
| Pallanuoto | Real Federación Española de Natación (**RFEN**) | federaciones autonómicas |
| Pallamano | Real Federación Española de Balonmano (**RFEBM**); ASOBAL per il massimo campionato maschile | federaciones territoriales |
| Rugby | Real Federación Española de Rugby (**FER**) | federaciones autonómicas |
| Hockey su prato | Real Federación Española de Hockey (**RFEH**) | federaciones autonómicas |
| Hockey su ghiaccio | Real Federación Española de Deportes de Hielo (**RFEDH**) | federaciones/club territoriali, struttura da approfondire |
| Baseball, Softball | Real Federación Española de Béisbol y Sófbol (**RFEBS**) | federaciones autonómicas |
| Lacrosse | Asociación Española de Lacrosse / **Spain Lacrosse (AEL)** | circuito associativo; delega federale non verificata |
| Football americano | Federación Española de Fútbol Americano (**FEFA**) | federaciones territoriales/autonómicas |

Fonti quadro: [RFEF — Federaciones Territoriales](https://rfef.es/es/noticias/institucional/federaciones-territoriales), [RFEF — Competiciones](https://rfef.es/es/competiciones), [FEB](https://www.feb.es/), [RFEN Waterpolo](https://rfen.es/especialidades/waterpolo/), [FER](https://ferugby.es/), [RFEH](https://eshockey.es/), [RFEDH](https://www.rfedh.es/), [RFEBS](https://www.rfebs.es/es/), [FEFA](https://www.fefa.es/).

## 3. Inventario per Sport

### 3.1 Calcio (`Calcio`)

**Verificate nel contenuto/portale RFEF:**

| Denominazione | Segmento e scope | Fonte corrente |
| --- | --- | --- |
| `Primera Federación` | senior maschile nazionale federale | [RFEF](https://rfef.es/es/competiciones/primera-federacion), 2025-2026 |
| `Segunda Federación` | senior maschile nazionale federale | [RFEF Competiciones](https://rfef.es/es/competiciones) |
| `Tercera Federación` | senior maschile nazionale con gruppi territorializzati | [RFEF Competiciones](https://rfef.es/es/competiciones) |
| `Primera Federación Femenina` | senior femminile nazionale | [calendario 2025/26](https://rfef.es/es/noticias/calendario-completo-de-primera-federacion-femenina-temporada-202526-0) |
| `Segunda Federación FUTFEM` | senior femminile nazionale | [RFEF](https://rfef.es/es/competiciones/segunda-federacion-futfem) |
| `Tercera Federación FUTFEM` | senior femminile nazionale/territorializzata | [RFEF](https://rfef.es/es/noticias/competiciones-femeninas/tercera-federacion-futfem) |

**Principali giovani nazionali da ricontrollare sul calendario corrente:** `División de Honor Juvenil` e `Liga Nacional Juvenil`; non vengono confuse con age class territoriali. Fonte generale: [calendario della stagione RFEF](https://rfef.es/es/federacion/transparencia/calendario-temporada-vigente).

**Territorio:** le Federaciones Territoriales organizzano categorie regionali (`Preferente`, `Primera`, `Segunda`, ecc.) con denominazioni e gerarchie che variano. Non viene creato un livello spagnolo unico da label omonime; ogni futura voce richiede federation territoriale e stagione.

**Fuori selector iniziale:** coppe e competizioni professionistiche. **Lacune:** denominazioni territoriali federation-by-federation, giovani femminili e football aficionado speciale.

### 3.2 Calcio a 8 (`Calcio a 8`)

`Fútbol 8` è un **formato/pratica**, soprattutto giovanile o territoriale. Non eredita `Primera/Segunda/Tercera Federación`. Le regole e categorie devono essere attribuite alla singola Federación Territorial; la fonte RFEF sulle [Federaciones Territoriales](https://rfef.es/es/noticias/institucional/federaciones-territoriales) definisce gli organizer, non un campionato nazionale uniforme.

**Copertura:** parziale; nessuna competition nazionale uniforme verificata. **Decisione:** preservare il valore UI senza associare automaticamente categorie del fútbol 11.

### 3.3 Futsal

| Denominazione | Segmento | Stato/fonte |
| --- | --- | --- |
| `Primera División FS` | senior maschile nazionale | portale [Fútbol Sala RFEF](https://futsal.rfef.es/), da ricontrollare formula 2026-2027 |
| `Segunda División FS` | senior maschile nazionale | [risultati 2026 RFEF](https://futsal.rfef.es/competicion/segunda/2026/resultados) |
| `Segunda División B FS` | senior maschile federale con gruppi | fonte ufficiale generale RFEF; composizione corrente da ricontrollare |
| `Primera División FS Femenina` | senior femminile nazionale | portale Fútbol Sala RFEF, denominazione corrente da controllo manuale |
| `Segunda División FS Femenina` | senior femminile nazionale | [RFEF](https://rfef.es/es/competiciones/segunda-division-fs-femenina), [calendario 2026](https://futsal.rfef.es/competicion/segunda-femenina/2026/calendario) |

**Territorio:** categorie inferiori e giovani sono delle Federaciones Territoriales. **Lacune:** denominazioni territoriali, principali giovani nazionali e conferma formula 2026-2027.

### 3.4 Volley (`Volley`)

**Organizzatore:** RFEVB; federaciones autonómicas sotto il livello nazionale.

Denominazioni nazionali candidate verificate/individuate nel portale RFEVB:

- `Superliga Masculina` e `Superliga Femenina`;
- `Superliga Masculina 2` e `Superliga Femenina 2`;
- `Primera División Masculina` e `Primera División Femenina`.

Fonti: [RFEVB competiciones](https://www.rfevb.com/competiciones) e [CESA Voleibol](https://cesa.rfevb.com/es/) per il principale circuito giovanile di selezioni autonómicas. La pagina individuale indicizzata per Superliga Masculina 2 non è più raggiungibile e non viene citata come prova autonoma.

**Stato:** nomi senior da ricontrollare nei règlements/calendari 2026-2027; CESA è competizione giovanile distinta, non livello club. **Territorio:** categorie autonome non uniformate. **Coppe:** escluse. **Copertura:** parziale utile.

### 3.5 Basket (`Basket`)

**Organizzatori:** FEB; ACB per `Liga Endesa` professionistica, annotata solo come boundary.

| Denominazione | Segmento | Fonte 2025-2026 |
| --- | --- | --- |
| `Primera FEB` | senior maschile nazionale | [FEB](https://www.feb.es/primerafeb/inicio.aspx), [calendario](https://baloncestoenvivo.feb.es/calendario/primerafeb/1/2025) |
| `Segunda FEB` | senior maschile nazionale | [calendario FEB](https://baloncestoenvivo.feb.es/calendario/segundafeb/2/2025) |
| `Tercera FEB` | senior maschile nazionale territorializzato | [risultati FEB](https://baloncestoenvivo.feb.es/resultados/tercerafeb/3/2025) |
| `Liga Femenina Endesa` | senior femminile nazionale | portale [Competiciones FEB](https://baloncestoenvivo.feb.es/) |
| `LF Challenge` | senior femminile nazionale | portale Competiciones FEB |
| `Liga Femenina 2` | senior femminile nazionale | portale Competiciones FEB |

**Giovani principali:** `Campeonato de España de Clubes` per age class è una famiglia di competizioni, non una categoria unica; nomi U18/U16/U14 richiedono estrazione dal calendario corrente. **Territorio:** competizioni autonome/provinciali scoped alla relativa federation. **Lacune:** categorie territoriali e giovani dettagliate. Coppe escluse.

### 3.6 Pallanuoto (`Pallanuoto`)

**Organizzatore:** RFEN.

Il portale [RFEN Waterpolo](https://wp.rfen.es/es/tournaments) e la [sezione federale](https://rfen.es/especialidades/waterpolo/) documentano come denominazioni selector candidate:

- `División de Honor Masculina` e `División de Honor Femenina`;
- `Primera División Masculina` e `Primera División Femenina`;
- `Segunda División Masculina` e `Segunda División Femenina`.

Il [documento División de Honor Masculino 2025/2026](https://cdn.rfen.es/sectionFiles/1774440332_2252.pdf) fornisce una validità stagionale specifica. **Giovani:** campionati di Spagna per categorie d'età presenti nel sistema RFEN, ma elenco corrente rinviato. **Territorio:** federaciones autonómicas. **Copertura:** parziale utile; formule e denominazioni 2026-2027 da verificare.

### 3.7 Pallamano (`Pallamano`)

**Organizzatori:** RFEBM; ASOBAL per `Liga Plenitude` maschile professionistica.

| Denominazione | Segmento | Fonte |
| --- | --- | --- |
| `División de Honor Plata Masculina` | senior maschile nazionale | [RFEBM 2025-2026](https://www.rfebm.com/wpfd_file/division-de-honor-plata-2025-2026/) |
| `Primera División Nacional Masculina` | senior maschile federale | portale [RFEBM](https://www.rfebm.com/) |
| `Liga Guerreras Iberdrola` | senior femminile nazionale | RFEBM, denominazione corrente da ricontrollare |
| `División de Honor Oro Femenina` | senior femminile nazionale | [RFEBM](https://www.rfebm.com/arranca-la-batalla-final-por-el-ascenso-a-oro-femenina-2/) |
| `División de Honor Plata Femenina` | senior femminile nazionale | [RFEBM](https://www.rfebm.com/division-de-honor-plata-femenina-ya-tiene-calendario/) |
| `Primera División Estatal Femenina` | senior femminile federale/territorializzata | [RFEBM](https://www.rfebm.com/definidos-los-sectores-de-primera-division-estatal-femenina/) |

**Giovani:** CESA e campeonatos estatales per age class da dettagliare in seguito. **Territorio:** federaciones territoriales; nomi locali non censiti. Coppe escluse.

### 3.8 Rugby (`Rugby`)

**Organizzatore:** FER; federaciones autonómicas territorialmente.

Denominazioni senior individuate:

- `División de Honor` e `División de Honor B` — senior maschile nazionale;
- `División de Honor Femenina` e livello femminile nazionale sottostante — denominazione sponsorizzata/formula corrente da ricontrollare;
- competizioni regionali organizzate dalle federaciones autonómicas, senza tassonomia nazionale uniforme.

Fonte verificata per il massimo campionato: [calendario División de Honor FER](https://ferugby.es/calendario-division-de-honor/); fonte risultati generale: [FER iSquad](https://resultadosrugby.isquad.es/competicion.php).

**Lacune:** denominazione corrente esatta del secondo livello femminile, Primera Nacional/territoriali, giovani nazionali e validità 2026-2027. Copertura parziale.

### 3.9 Hockey su prato (`Hockey su prato`)

**Organizzatore:** RFEH.

Il portale [Información Competiciones RFEH](https://eshockey.es/informacion-competiciones/) e [resultados RFEH](https://resultadoshockey.isquad.es/) individuano:

- `División de Honor A Masculina`;
- `División de Honor B Masculina`;
- `Liga Iberdrola` / massima divisione femminile, denominazione corrente da confermare;
- `Primera División Masculina` e `Primera División Femenina`, da verificare per stagione e formula.

**Giovani:** campeonatos de España per age class, elenco rinviato. **Territorio:** federaciones autonómicas. Hockey sala resta disciplina/formato distinto. **Copertura:** parziale, con controllo manuale necessario sulle denominazioni 2026-2027.

### 3.10 Hockey su ghiaccio (`Hockey su ghiaccio`)

**Organizzatore:** RFEDH.

Fonti ufficiali: [LNHH RFEDH](https://www.rfedh.es/hockey-hielo-lnhh/) e [portale Hockey Hielo](https://hockey.fedhielo.com/). Denominazioni individuate:

- `Liga Nacional de Hockey Hielo` / denominazione sponsorizzata stagionale — senior maschile;
- campionato nazionale femminile — denominazione corrente non fissata senza regolamento;
- competizioni `U20`, `U18`, `U15` — age class, non livelli senior.

**Lacune:** eventuale `Liga Ibérica`, formule femminili, livelli inferiori, struttura territoriale e stagione 2026-2027. Copertura fortemente parziale; nessuna gerarchia inventata.

### 3.11 Baseball (`Baseball`)

**Organizzatore:** RFEBS; federaciones autonómicas territorialmente.

Per l'anno civile 2026 le pubblicazioni ufficiali RFEBS/WBSC individuano:

- `Liga Nacional de Béisbol División de Honor Oro`;
- `Liga Nacional de Béisbol División de Honor Plata`.

Fonti: [RFEBS](https://www.rfebs.es/es/), [Calendarios y Actividades 2026](https://static.wbsc.org/uploads/federations/39/cms/documents/f3cc9f02-4e3e-8e5a-9de9-e2b9a7e0e5e4.pdf), [regolamento Plata 2026](https://static.wbsc.org/uploads/federations/39/cms/documents/ad023a57-4c38-4604-689f-b37b373357f4.pdf).

**Giovani:** campeonatos de España per age class da estrarre in una successiva integrazione. **Lacune:** livelli regionali, eventuali cambi nome rispetto al 2025 e competizioni femminili. Coppe escluse.

### 3.12 Softball (`Softball`)

**Organizzatore:** RFEBS, con competizioni distinte dal Baseball.

Denominazioni 2026 individuate nelle pubblicazioni RFEBS:

- `Liga Nacional de Sófbol División de Honor Oro`;
- `Liga Nacional de Sófbol División de Honor Plata`;
- separazione femminile/maschile da confermare per ciascuna formula prima del selector.

Fonte stagione: [Calendarios y Actividades RFEBS 2026](https://static.wbsc.org/uploads/federations/39/cms/documents/f3cc9f02-4e3e-8e5a-9de9-e2b9a7e0e5e4.pdf). **Lacune:** categorie autonome, giovani, slowpitch e denominazione completa per genere. Copertura parziale.

### 3.13 Lacrosse (`Lacrosse`)

**Organizzatore/circuito:** Asociación Española de Lacrosse / Spain Lacrosse (AEL), senza attribuire automaticamente status di federation delegata.

- `Liga Senior Masculina` — competition candidate documentata: [Spain Lacrosse](https://spainlacrosse.org/liga-senior/);
- circuito femminile, giovani, livelli e articolazione territoriale: non verificati.

La [homepage AEL](https://spainlacrosse.org/) è fonte organizzativa; non prova una gerarchia federale. Copertura **fortemente parziale**.

### 3.14 Football americano (`Football americano`)

**Organizzatore:** FEFA.

| Denominazione | Segmento | Fonte 2025-2026 |
| --- | --- | --- |
| `LNFA` | senior maschile; articolazione interna da confermare | [FEFA](https://www.fefa.es/lnfa-2025-2026/) |
| `LNFA Femenina` | senior femminile | [FEFA](https://www.fefa.es/lnfa-femenina-2025-2026/) |

Eventuali `Serie A`/`Serie B` o conferenze non vengono fissate senza regolamento corrente. Flag football resta disciplina separata e non viene ereditato nel selector Football americano. **Lacune:** livelli maschili, giovani, territoriali e formula femminile.

## 4. Matrice di copertura iniziale

| Sport | Senior M | Senior F | Territorio | Giovani nazionali | Esito |
| --- | --- | --- | --- | --- | --- |
| Calcio | buono | buono | struttura, non nomi | parziale | parziale utile |
| Calcio a 8 | non uniforme | non uniforme | organizer sì | parziale | parziale |
| Futsal | buono | parziale | struttura | mancante | parziale utile |
| Volley | buono | buono | struttura | CESA only | parziale utile |
| Basket | buono | buono | struttura | famiglia identificata | parziale utile |
| Pallanuoto | buono | buono | struttura | mancante | parziale utile |
| Pallamano | buono | buono | struttura | famiglia identificata | parziale utile |
| Rugby | buono | incompleto | struttura | mancante | parziale |
| Hockey prato | parziale | parziale | struttura | mancante | parziale |
| Hockey ghiaccio | parziale | debole | incompleto | age class parziali | fortemente parziale |
| Baseball | buono 2026 | incompleto | struttura | mancante | parziale utile |
| Softball | parziale | parziale | struttura | mancante | parziale |
| Lacrosse | parziale | mancante | mancante | mancante | fortemente parziale |
| Football americano | parziale | parziale | struttura | mancante | parziale |

Nessuna copertura è dichiarata completa o pronta a popolare i selector.

## 5. Regole per il futuro selector

1. `country + sport + organizer` precedono la competition.
2. Le categorie territoriali includono sempre la Federación autonómica/territoriale.
3. `Primera División`, `División de Honor` e `Liga Nacional` non sono identity condivise tra sport/circuiti.
4. Genere e age class non sono dedotti dalla sola label.
5. Fútbol 8 non eredita il fútbol 11; flag non eredita Football americano; hockey sala non eredita hockey hierba.
6. Coppe escluse dal primo selector campionati.
7. Nomi spagnoli preservati; sponsor name e rename devono essere validity-aware.

## 6. Verifica dei fatti vs riuso

Questa ricognizione dimostra che denominazioni e organizzatori possono essere documentati con fonti ufficiali, ma non valuta licenza/database rights, stable ID o coverage machine-readable. Quindi:

- documento utile alla review prodotto: **SÌ**;
- manifest/seed/import automatico autorizzato: **NO**;
- categorie legacy italiane o francesi invalidate: **NO**;
- squadre, risultati, calendari copiati: **NO**.

## 7. Stato e stop gate

| Voce | Stato |
| --- | --- |
| Francia | PASS metodologico; lacune registrate per integrazione futura |
| Spagna | prima ricognizione pronta per review, copertura parziale |
| Svizzera/Slovenia/Polonia | non iniziate |
| Applicazione/API/UI | non modificate |
| Migration/seed/import/backfill | no / no / no / no |
| Preview/Production | non interrogate/modificate |
| RLS/grant/ownership/Applications/Mobile | non modificati |

**Stop gate:** non iniziare la Svizzera prima della review umana della Spagna. La review deve distinguere correzioni di denominazione da richieste di maggiore copertura e concentrarsi su hockey, lacrosse, football americano, territoriali e principali giovani.
