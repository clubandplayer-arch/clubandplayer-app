# FASE 5D-E-R-CH — Ricerca documentale per i selettori sportivi della Svizzera

Data ricerca: 2026-09-07
Paese: **Svizzera (CH)**
Stato: **PRIMA RICOGNIZIONE COMPLETATA CON COPERTURA PARZIALE DICHIARATA — REVIEW UMANA RICHIESTA**
Perimetro: i 14 Sport esposti dall'app; priorità senior maschile/femminile dilettantistica, principali giovani nazionali e struttura regionale senza censire i gironi.

## 1. Continuità e regole multilingui

Il PASS Spagna approva il metodo, non certifica ogni denominazione né autorizza i selector. Le lacune di Francia e Spagna restano registrate e non vengono riaperte. Questa tranche non modifica foundation, categorie legacy o contratto 5B.

Per la Svizzera una label in tedesco, francese o italiano viene collegata come equivalente soltanto quando la fonte federale contiene un riferimento esplicito alla **medesima competizione** — per esempio lo stesso competition ID, record, regolamento o pagina con selezione locale. La semplice presenza di due denominazioni nello stesso sito federale non basta a provarne l'equivalenza. In assenza del riferimento comune le forme restano candidate separate. I nomi sponsorizzati sono validity-aware e non sostituiscono automaticamente il nome stabile.

Classificazione dell'evidenza:

- **verificata**: nome e scope visibili in una fonte ufficiale accessibile;
- **candidate da ricontrollare**: fonte ufficiale individuata, ma formula, lingua equivalente o stagione non pienamente verificata;
- **lacuna**: dato non accertato, mai dichiarato inesistente.

Coppe e competizioni per selezioni cantonali/regionali sono fuori dal primo elenco Club. L'assenza di un dataset importabile non impedisce questa ricerca fattuale e non autorizza seed/import.

Il controllo automatizzato dei 40 URL ufficiali unici citati ha restituito 34 risposte `200` e 6 risposte `403` anti-automazione. Un `403` richiede controllo manuale e non viene interpretato come fonte inesistente; le relative denominazioni rimangono candidate o parziali.

## 2. Organizzatori

| Sport UI | Organizzazione / circuito | Articolazione |
| --- | --- | --- |
| Calcio, Calcio a 8, Futsal | Schweizerischer Fussballverband / Association Suisse de Football / Associazione Svizzera di Football (**SFV/ASF**) | Amateur Liga e associazioni regionali; Swiss Football League per il professionismo |
| Volley | **Swiss Volley** | associazioni regionali Swiss Volley |
| Basket | **Swiss Basketball** | associazioni regionali |
| Pallanuoto | **Swiss Aquatics Water Polo** | regioni/associazioni, struttura da approfondire |
| Pallamano | Schweizerischer Handball-Verband / Fédération Suisse de Handball (**SHV/FSH**) | associazioni/regioni; leghe nazionali SHV |
| Rugby | Fédération Suisse de Rugby / Swiss Rugby (**FSR**) | associazioni e competizioni FSR |
| Hockey su prato | **Swiss Hockey** | competizioni nazionali e regionali |
| Hockey su ghiaccio | Swiss Ice Hockey Federation (**SIHF**) | Regio League; National League/Swiss League come boundary professionale separato |
| Baseball, Softball | Swiss Baseball & Softball Federation (**SBSF**) | leghe nazionali e attività regionali |
| Lacrosse | Swiss Lacrosse Federation / **Swisslax** | leghe Swisslax |
| Football americano | Schweizerischer American Football Verband (**SAFV**) | leghe nazionali; flag separato |

Fonti quadro: [SFV/ASF](https://www.football.ch/), [Swiss Volley](https://www.volleyball.ch/), [Swiss Basketball](https://swiss.basketball/), [Swiss Aquatics](https://www.swiss-aquatics.ch/leistungssport/water-polo/), [Handball Schweiz](https://www.handball.ch/), [Suisse Rugby](https://www.suisserugby.com/), [Swiss Hockey](https://swisshockey.org/), [SIHF](https://www.sihf.ch/), [SBSF](https://www.swiss-baseball.ch/), [Swisslax](https://swisslax.ch/), [SAFV](https://www.safv.ch/).

## 3. Inventario per Sport

### 3.1 Calcio (`Calcio`)

**Organizer:** SFV/ASF; Swiss Football League per `Super League`/`Challenge League`; Erste Liga e Amateur Liga/associazioni regionali sotto il boundary professionale.

| Denominazione ufficiale | Segmento/scope | Evidenza |
| --- | --- | --- |
| `Promotion League` | senior maschile nazionale | [Match Center SFV](https://matchcenter.football.ch/), stagione 2026 |
| `1. Liga Classic` | senior maschile nazionale a gruppi | Match Center SFV; formula corrente da ricontrollare |
| `2. Liga interregional` | senior maschile interregionale | [Match Center SFV 2026](https://matchcenter.football.ch/default.aspx?oid=1&lng=1&s=2026&ln=21020) |
| `AXA Women's Super League` | senior femminile nazionale | sezione Frauenfussball SFV; sponsor name da validare per stagione |
| `Nationalliga B` / `Ligue nationale B` | senior femminile nazionale | [pagina ASF francese](https://football.ch/fr/asf/juniorinnen-und-frauenfussball/championnats/lnb.aspx) |

**Equivalenze linguistiche candidate:** `1. Liga`/`1re Ligue`/`Prima Lega` e `2. Liga interregional`/`2e ligue interrégionale`/`Seconda Lega interregionale` devono essere collegate soltanto tramite competition ID/URL SFV comune; non mediante traduzione libera.

**Territorio:** le associazioni regionali organizzano tipicamente `2. Liga`, `3. Liga`, `4. Liga`, `5. Liga` e categorie femminili regionali. Sono **level label candidate**, non identità nazionali: ogni voce futura conserva associazione regionale e stagione.

**Giovani principali:** `U-19`, `U-17`, `Youth League A/B/C` sono candidate da verificare nel Match Center corrente; selezioni regionali escluse. **Lacune:** denominazioni ufficiali complete 2026-2027, gerarchia femminile regionale, riserve e veterani. Coppe escluse.

### 3.2 Calcio a 8 (`Calcio a 8`)

`Fussball 8 / Football à 8 / Calcio a 8` è formato/pratica prevalentemente giovanile o regionale. Non eredita Promotion League o le leghe del calcio a undici. Le associazioni regionali sono gli organizer da verificare per ogni categoria; nessuna competizione nazionale uniforme è stata confermata.

**Copertura:** fortemente parziale. Il valore UI resta utilizzabile, ma non viene creata alcuna equivalenza di categoria automatica.

### 3.3 Futsal

**Organizer:** SFV/ASF.

- `Swiss Futsal Premier League` — senior maschile nazionale, **verificata** sulla [pagina SFV](https://www.football.ch/sfv/breitenfussball/futsal/sfpl.aspx), stagione 2026;
- `Swiss Futsal Second League` — candidate secondo livello nazionale, denominazione/formula corrente da ricontrollare nel Match Center;
- campionato femminile e giovani — lacuna nella presente tranche;
- competizioni regionali — da associare alla competente associazione regionale.

Fonte generale: [Swiss Futsal SFV](https://www.football.ch/SFV/Breitenfussball/Futsal.aspx). La Swiss Futsal Cup è esclusa dal selector campionati.

### 3.4 Volley (`Volley`)

**Organizer:** Swiss Volley; associazioni regionali per i livelli inferiori.

| Nome tedesco | Equivalente francese ufficiale | Segmento |
| --- | --- | --- |
| `Nationalliga A` (`NLA`) | `Ligue nationale A` (`LNA`) | senior M e F nazionale |
| `Nationalliga B` (`NLB`) | `Ligue nationale B` (`LNB`) | senior M e F nazionale |
| `1. Liga` | `1re ligue` | senior M e F nazionale/regionale secondo formula |

Fonti: [wichtige Daten nationale Ligen](https://www.volleyball.ch/de/wissen/wichtige-daten-spielbetrieb-nationale-ligen), [Modus NLB](https://www.volleyball.ch/de/wissen/modus-nlb), [Championnats nationaux](https://www.volleyball.ch/fr/sport-de-performance/volleyball/championnats-nationaux). La presenza delle versioni DE/FR sul medesimo sito federation permette il collegamento come display names, non come competition distinte.

**Territorio:** [Regionale Meisterschaften](https://www.volleyball.ch/de/breitensport/erwachsene/regionale-meisterschaften), con `2. Liga` e livelli inferiori variabili per regione. **Giovani:** campionati nazionali `U23`, `U20`, `U18`, `U16`, `U14` candidate; genere e stagione da validare. Coppe escluse.

### 3.5 Basket (`Basket`)

**Organizer:** Swiss Basketball e associazioni regionali.

Denominazioni verificate nel portale nazionale:

- `Swiss Basketball League Men` e `Swiss Basketball League Women` — senior nazionali;
- `NLB Men` e `NLB Women` — secondi campionati nazionali candidate;
- `NL1 Men` e `NL1 Women` — federali nazionali; [NL1 Women](https://swiss.basketball/national-competitions/nl1/women);
- livelli regionali (`2e ligue`, `3e ligue`, equivalenti tedeschi/italiani) — scoped all'associazione regionale, non automaticamente equivalenti.

Fonte: [Swiss Basketball national competitions](https://swiss.basketball/national-competitions), [SBL Women](https://swiss.basketball/national-competitions/sbl/women). **Giovani:** `U18`, `U16`, `U14` national championships candidate. Coppe e selezioni regionali escluse. **Lacune:** sponsor names, formula NLB/NL1 2026-2027 e tassonomia regionale.

### 3.6 Pallanuoto (`Pallanuoto`)

**Organizer:** Swiss Aquatics Water Polo.

- `National League A` (`NLA`) — senior maschile, verificata sul [Match Center](https://wpmatch.ch/national-league-a/);
- `National League B` (`NLB`) e `National League C` (`NLC`) — senior maschile candidate da regolamento corrente;
- `National League Women` / denominazione femminile corrente — da ricontrollare;
- `U20`, `U18`, `U16`, `U14` — age class candidate, non livelli senior.

Fonti: [Swiss Aquatics Water Polo](https://www.swiss-aquatics.ch/leistungssport/water-polo/), [Match Center](https://wpmatch.ch/), [Anmeldung Meisterschaft 2026/2027](https://www.swiss-aquatics.ch/leistungssport/water-polo/wettkampfbetrieb/anmeldung-meisterschaft-2026-2027/). **Lacune:** forma DE/FR/IT ufficiale, struttura femminile, regionali e formule correnti. Copertura parziale.

### 3.7 Pallamano (`Pallamano`)

**Organizer:** SHV/FSH.

| Denominazione | Segmento | Stato |
| --- | --- | --- |
| `Quickline Handball League` (`QHL`) | senior maschile nazionale | verificata, sponsor name corrente |
| `Nationalliga B` (`NLB`) | senior maschile nazionale | verificata nel piano SHV |
| `1. Liga`, `2. Liga` | senior maschile/femminile federale-regionale | candidate scoped per competizione/region |
| `SPAR Premium League 1` (`SPL1`) | senior femminile nazionale | verificata nel [Matchcenter](https://www.handball.ch/de/matchcenter/gruppen/16748) |
| `SPAR Premium League 2` (`SPL2`) | senior femminile nazionale | candidate da piano stagione |

Fonti: [Swiss Premium League](https://www.handball.ch/de/swiss-premium-league), [Terminplan SHV 2025/26](https://www.handball.ch/media/2lbas424/terminplan_shv_25-26_v7.pdf), [Spielbetrieb](https://www.handball.ch/de/spielbetrieb/abteilung/). **Giovani principali:** `U19`, `U17`, `U15`, `U13` national/interregional candidate. Coppe e selezioni regionali escluse. **Lacune:** equivalenze FR/IT e formule 2026-2027.

### 3.8 Rugby (`Rugby`)

**Organizer:** Fédération Suisse de Rugby / Suisse Rugby.

Il [portale competizioni FSR](https://fsr.sportlomo.com/competitions/) individua:

- `Ligue Nationale A` (`LNA`), `Ligue Nationale B` (`LNB`), `Ligue Nationale C` (`LNC`) — senior maschile;
- competizione femminile nazionale — nome/formula corrente da ricontrollare;
- Development/regionale — candidate, non livelli automaticamente collegati;
- giovani nazionali per classi d'età — elenco corrente da verificare.

La [homepage FSR](https://www.suisserugby.com/) conferma l'organizer; le equivalenze `Nationalliga`/`Ligue nationale` non vengono registrate finché una pagina multilingue comune non le lega. **Copertura:** parziale, soprattutto femminile e giovani. Coppe escluse.

### 3.9 Hockey su prato (`Hockey su prato`)

**Organizer:** Swiss Hockey.

Il [servizio risultati 2026](https://intranet.swisshockey.org/?s=F2026) e [Swiss Hockey](https://swisshockey.org/) permettono di individuare:

- `Nationalliga A`/`NLA` Feld — senior uomini e donne;
- `Nationalliga B`/`NLB` Feld — senior, genere/formula da ricontrollare;
- `1. Liga` e regionali — candidate scoped;
- giovani `U18/U15/U12` — candidate, non livelli senior.

Le forme francesi/italiane non vengono dedotte. Indoor/Hallenhockey resta disciplina/formato distinto. **Lacune:** composizione completa, donne NLB, regionali e stagione corrente verificata nel contenuto. Copertura parziale.

### 3.10 Hockey su ghiaccio (`Hockey su ghiaccio`)

**Organizer:** SIHF; Regio League per il dilettantismo. National League e Swiss League sono boundary professionali/semi-professionali, non priorità selector.

| Denominazione | Segmento | Fonte |
| --- | --- | --- |
| `MyHockey League` | senior maschile nazionale | [SIHF](https://www.sihf.ch/de/ligen/myhockey-league/) |
| `1. Liga`, `2. Liga`, `3. Liga`, `4. Liga` | senior dilettantistico regionale | SIHF Regio League; gruppi regionali non censiti |
| `Women's League` | senior femminile nazionale | SIHF, formula corrente da verificare |
| `SWHL B`, `SWHL C`, `SWHL D` | senior femminile | candidate da regolamento stagione |
| `U20-Elit`, `U20-Top`, `U18-Elit`, `U18-Top` | giovani nazionali | candidate; age class e performance tier distinti |

Fonte generale: [SIHF Game Center](https://www.sihf.ch/de/game-center/). **Multilinguismo:** SIHF offre [versione francese](https://www.sihf.ch/fr/); collegare display name solo sul medesimo league ID. Coppe escluse.

### 3.11 Baseball (`Baseball`)

**Organizer:** SBSF.

La pagina [Spielbetrieb SBSF](https://www.swiss-baseball.ch/spielbetrieb/) individua come candidate correnti:

- `National League A` (`NLA`) Baseball;
- `National League B` (`NLB`) Baseball;
- `1. Liga` Baseball;
- campionati giovanili per age class, denominazioni correnti da verificare.

I nomi inglesi/tedeschi del sito federation non vengono tradotti. **Territorio:** eventuali divisioni regionali sono gruppi/scope, non competition identity separate senza fonte. **Lacune:** stagione 2026, genere, giovani e formula promozione. Coppe escluse.

### 3.12 Softball (`Softball`)

**Organizer:** SBSF, competition identity separate dal Baseball.

- `National League A` Softball — senior, verosimilmente femminile ma genere da confermare nel regolamento corrente;
- `National League B` Softball — candidate;
- giovani/slowpitch — lacuna.

Fonte: [SBSF Spielbetrieb](https://www.swiss-baseball.ch/spielbetrieb/). **Copertura:** fortemente parziale; nessuna equivalenza con le leghe Baseball per la sola label.

### 3.13 Lacrosse (`Lacrosse`)

**Organizer:** Swiss Lacrosse Federation / Swisslax.

La pagina [Ligen](https://swisslax.ch/ligen/) documenta campionati maschili e femminili; denominazioni `NLA`/`NLB` o formule precise sono candidate da ricontrollare nel contenuto corrente. [Swisslax](https://swisslax.ch/) e l'[Organigramm](https://swisslax.ch/organigramm/) confermano l'organizzazione.

**Lacune:** nomi esatti 2026, livelli, giovani, regionali e distinzione field/box. Nessuna gerarchia viene inventata. Copertura fortemente parziale.

### 3.14 Football americano (`Football americano`)

**Organizer:** SAFV.

La pagina [Unsere Ligen](https://www.safv.ch/ligen-367492v4) individua:

- `Nationalliga A` (`NLA`), `Nationalliga B` (`NLB`), `Nationalliga C` (`NLC`) — senior tackle;
- campionato femminile — denominazione/formula corrente da verificare;
- Junior leagues, incluse age class nazionali — nomi correnti da verificare;
- Flag leagues — circuito distinto e fuori dal selector Football americano.

Fonte calendario: [SAFV Game Center](https://www.safv.ch/game-center/spielplan). **Lacune:** equivalenti FR/IT, senior femminile, U19/U16, struttura regionale e validità 2026-2027.

## 4. Matrice di copertura

| Sport | Senior M | Senior F | Regionali | Giovani | Esito |
| --- | --- | --- | --- | --- | --- |
| Calcio | buono | parziale | struttura + label candidate | parziale | parziale utile |
| Calcio a 8 | debole | debole | organizer candidate | parziale | fortemente parziale |
| Futsal | buono top | mancante | parziale | mancante | parziale |
| Volley | buono | buono | struttura | parziale | parziale utile |
| Basket | buono | buono | struttura | parziale | parziale utile |
| Pallanuoto | parziale | debole | incompleto | parziale | parziale |
| Pallamano | buono | buono | parziale | parziale | parziale utile |
| Rugby | buono | debole | incompleto | mancante | parziale |
| Hockey prato | parziale | parziale | incompleto | parziale | parziale |
| Hockey ghiaccio | buono | parziale | buono per level label | parziale | parziale utile |
| Baseball | parziale | non verificato | incompleto | mancante | parziale |
| Softball | parziale | da confermare | incompleto | mancante | fortemente parziale |
| Lacrosse | parziale | parziale | mancante | mancante | fortemente parziale |
| Football americano | buono | debole | incompleto | parziale | parziale |

Nessuna riga è completa o pronta a popolare i selector.

## 5. Regole per i futuri selector svizzeri

1. Chiave logica: `country + sport + organizer + competition`, con season/validity separata.
2. DE/FR/IT sono display names della stessa identity solo con un riferimento federation esplicito alla medesima competizione; la coesistenza sullo stesso sito non è prova sufficiente e non autorizza traduzione automatica.
3. `NLA`, `NLB`, `1. Liga` sono ambigue tra Sport: richiedono sempre sport e organizer.
4. Regional association obbligatoria per livelli territoriali.
5. Calcio a 8, indoor hockey e flag non ereditano automaticamente i campionati della disciplina principale.
6. Genere e age class restano attributi/relazioni distinti.
7. Coppe e selezioni territoriali restano fuori dal primo elenco Club.

## 6. Fatti, riuso e stato operativo

La ricerca documenta nomi e strutture, ma non certifica licenze, stable ID o dataset importabili. Non sono stati copiati club, risultati o calendari.

| Voce | Stato |
| --- | --- |
| Francia | PASS metodo; lacune conservate |
| Spagna | PASS prima ricognizione; lacune conservate |
| Svizzera | prima ricognizione pronta per review |
| Slovenia/Polonia | non iniziate |
| Selector pronti da popolare | no |
| Applicazione/API/UI | non modificate |
| Migration/seed/import/backfill | no / no / no / no |
| Preview/Production | non interrogate/modificate |
| RLS/grant/ownership/Applications/Mobile | non modificati |

**Stop gate:** non iniziare la Slovenia prima della review Svizzera. I controlli prioritari sono equivalenze multilingui, leghe femminili, Pallanuoto, Rugby, Hockey su prato, Baseball/Softball e Lacrosse.
