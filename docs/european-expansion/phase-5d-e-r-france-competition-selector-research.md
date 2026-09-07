# FASE 5D-E-R-FR — Ricerca documentale per i selettori sportivi della Francia

Data ricerca: 2026-09-07
Paese: **Francia (FR)**
Stato: **RICERCA DOCUMENTALE COMPLETATA CON COPERTURA PARZIALE DICHIARATA — REVIEW UMANA RICHIESTA**
Perimetro: i 14 valori esposti da `SPORTS` in `lib/opps/constants.ts`; nessun database di club, squadra, risultato o calendario.

## 1. Collegamento con il lavoro esistente

Questa attività non sostituisce FASE 1, 5A, 5B o le liste legacy. La foundation conserva le identità canoniche degli Sport; `CATEGORIES_BY_SPORT` resta il catalogo applicativo italiano compatibile; il contratto 5B continua a distinguere organization, competition, level, group e age class. La ricerca aggiunge una vista **France/source-backed** utile a progettare in seguito i selettori, senza trasformare le denominazioni raccolte in record canonici.

In particolare:

- `Calcio`, `Calcio a 8` e `Futsal` sono tre valori UI, ma ricadono nell'ecosistema FFF con discipline/formati differenti;
- `Volley` è la chiave UI corrente; `Pallavolo` resta soltanto alias legacy;
- Baseball e Softball condividono la FFBS, ma conservano competizioni distinte;
- Lacrosse è documentato separatamente da France Lacrosse/AFL: non viene inventata una relazione gerarchica con FFBS;
- i nomi propri francesi restano in francese e non sono tradotti;
- l'ordine delle righe non dichiara una gerarchia se la fonte non la documenta.

## 2. Metodo, classificazioni e limiti

Sono state identificate esclusivamente pagine, portali competizioni, regolamenti e comunicati degli organismi ufficiali e, dove l'accesso diretto lo ha permesso, ne è stato verificato il contenuto. Una voce è inclusa solo quando la fonte o il relativo risultato ufficiale consente di verificarne almeno nome e organizzatore/scope. La stagione di riferimento preferita è **2025-2026**; sono usate pagine 2026-2027 o anno civile 2026 quando sono le pubblicazioni ufficiali correnti al 7 settembre 2026.

Il controllo HTTP automatizzato dei 51 URL unici citati ha restituito 28 risposte `200`, 21 `403` anti-automazione e due `503` dal portale Water-Polo FFN. `403/503` significa **verifica manuale richiesta**, non fonte inesistente: le relative voci restano marcate parziali e non possono da sole promuovere un record canonico. Nessun contenuto di fonte secondaria è stato usato come prova.

Classificazioni:

- **competition**: evento/campionato con identità propria;
- **level**: livello gerarchico solo quando documentato dall'organizzatore;
- **practice/format**: modalità di gioco, non livello;
- **age class**: classe d'età, non competition identity;
- **organization**: federation, league, territorial body o circuito separato.

Questa ricerca verifica fatti e denominazioni. **Non verifica né concede** licenza di riuso, database rights, stable record ID o idoneità all'import automatico. Le pagine HTML sono fonti documentali valide anche quando non sono dataset importabili.

## 3. Quadro degli organizzatori

| Sport UI | Organizzazione nazionale / organizzatori verificati | Articolazione o circuito |
| --- | --- | --- |
| Calcio, Calcio a 8, Futsal | Fédération Française de Football (**FFF**) | Ligues régionales e Districts; competizioni nazionali FFF e territoriali delle articolazioni |
| Volley | Fédération Française de Volley (**FFvolley**); Ligue Nationale de Volley (**LNV**) per il settore professionistico | Ligues régionales e comités départementaux |
| Basket | Fédération Française de BasketBall (**FFBB**); Ligue Nationale de Basket (**LNB**) per Betclic ÉLITE/ÉLITE 2 | Ligues régionales e comités départementaux |
| Pallanuoto | Fédération Française de Natation (**FFN**) | Ligues régionales e comités départementaux |
| Pallamano | Fédération française de handball (**FFHandball**); Ligue Nationale de Handball e Ligue Féminine de Handball per i settori professionali | Ligues e comités territoriali |
| Rugby | Fédération Française de Rugby (**FFR**); Ligue Nationale de Rugby per il professionismo | Ligues régionales per le competizioni regionali |
| Hockey su prato | Fédération Française de Hockey (**FFH**) | Ligues/comités territoriali; portale nazionale FFH |
| Hockey su ghiaccio | Fédération Française de Hockey sur Glace (**FFHG**) | zones/ligues per parte delle competizioni giovani e territoriali; portale FFHG |
| Baseball, Softball | Fédération Française de Baseball et Softball (**FFBS**) | ligues régionales; Commission Fédérale Sportive per le competizioni senior federali |
| Lacrosse | **France Lacrosse / Association Française de Lacrosse (AFL)** nelle fonti consultate | circuito AFL; relazione regolamentare completa con altre federazioni non accertata in questo passaggio |
| Football americano | Fédération Française de Football Américain (**FFFA**) | ligues régionales; discipline collegate flag football e cheerleading, non fuse col football americano |

Fonti quadro: [FFF — Ligues et Districts](https://www.fff.fr/89-les-ligues-et-districts.html), [FFvolley — championnats régionaux](https://www.ffvolley.org/competitions/volley-ball/championnats-regionaux/), [FFBB — portale competizioni](https://competitions.ffbb.com/), [FFN — ligues et comités](https://www.ffnatation.fr/retrouvez-les-ligues-regionales-et-comites-departementaux-repartis-sur-le-territoire), [FFR — règlements généraux](https://www.ffr.fr/ffr/publications-officielles/reglements-generaux), [FFBS — Commission Fédérale Sportive](https://ffbs.fr/commission-federale-sportive/).

## 4. Inventario per Sport

### 4.1 Calcio (`Calcio`)

**Organizzatore:** FFF; Ligues régionales e Districts per l'articolazione territoriale.

| Denominazione ufficiale verificata | Classificazione | Scope / segmento | Validità e fonte |
| --- | --- | --- | --- |
| `National` | competition/level nazionale documentato | senior maschile | calendario FFF 2025-2026: [compétitions seniors masculines](https://www.fff.fr/article/14528-competitions-seniors-masculines-calendrier-2025-2026.html) |
| `National 2` | competition/level nazionale documentato | senior maschile | portale FFF: [National 2](https://epreuves.fff.fr/competition/engagement/3-national-2) |
| `National 3` | competition/level nazionale documentato | senior maschile | [pagina FFF](https://www.fff.fr/237-.html) e [règlement 2025-2026](https://media.fff.fr/uploads/documents/reglement-du-national-3-20252026-ok.pdf) |
| `Arkema Première Ligue`, `Seconde Ligue` | competizioni nazionali | senior femminile | calendario FFF 2025-2026: [compétitions féminines](https://www.fff.fr/article/14569-competitions-feminines-le-calendrier-2025-2026.html) |
| `Championnat National U19`, `Championnat National U17` | competizioni nazionali per age class | giovani maschili | [U19](https://epreuves.fff.fr/competition/engagement/8-championnat-national-u19/phase/1/1/accueil), [calendriers FFF 2025-2026](https://www.fff.fr/article/15088-tous-les-calendriers-de-la-saison-2025-2026.html) |
| `Championnat National Féminin U19` | competizione nazionale per age class | giovani femminili | [portale FFF](https://epreuves.fff.fr/competition/engagement/9-championnat-national-feminin-u19), [règlement 2025-2026](https://media.fff.fr/uploads/documents/reglement-du-championnat-national-feminin-u19-2025-2026.pdf) |

**Territorio:** la FFF documenta Ligues e Districts, ma le denominazioni regionali/dipartimentali e il numero di livelli non sono uniformati qui. Per i futuri selector deve essere possibile associare una competition/level al relativo organizer territoriale; non va creato un generico `Régional` senza la Ligue competente.

**Lacune dichiarate:** coppe, football entreprise, loisir, veterani, overseas, tutte le categorie regionali/dipartimentali e l'intera struttura giovanile territoriale non sono censite. Le categorie professionistiche maschili non sono l'obiettivo prioritario e sono solo boundary di sistema.

### 4.2 Calcio a 8 (`Calcio a 8`)

La FFF riconosce `Football à 8 et à 5` come **pratica/formato**, non come singolo campionato nazionale uniforme: [pagina ufficiale FFF](https://www.fff.fr/8-les-footballs/119-football-a-8-et-a-5.html). Le regole e competizioni sono frequentemente territoriali, per esempio tramite District/Ligue; il [règlement Football à 8 2024-2025 della Ligue Méditerranée/District de Provence](https://provence.fff.fr/wp-content/uploads/sites/64/2024/09/Reglement-du-Football-a-8-2024-2025-1.pdf) prova uno scope locale, non una tassonomia nazionale completa.

**Decisione selector:** mantenere `Calcio a 8` come sport/variant legacy selezionabile, ma non associare automaticamente `National 3`, `Régional 1` o altre categorie del calcio a undici. Una voce territoriale futura deve includere organizer e fonte del District/Ligue.

**Lacune:** nessun inventario nazionale uniforme di competition names è stato trovato; adulti, loisir e age class variano territorialmente.

### 4.3 Futsal

**Organizzatore:** FFF a livello nazionale; Ligues/Districts territorialmente.

| Denominazione ufficiale | Tipo | Segmento | Fonte |
| --- | --- | --- | --- |
| `D1 Futsal` | competition nazionale | senior maschile | [portale competizione FFF](https://epreuves.fff.fr/competition/engagement/6-d1-futsal/phase/1/1/resultats-et-calendrier) |
| `D2 Futsal` | competition nazionale | senior maschile | [portale competizione FFF](https://epreuves.fff.fr/competition/engagement/7-d2-futsal/phase/1/1/accueil) |
| competizione nazionale femminile di futsal | coverage riconosciuta, denominazione da validare sul regolamento corrente prima del catalogo | senior femminile | calendario aggregato FFF 2025-2026: [toutes les affiches](https://www.fff.fr/article/15085-calendrier-toutes-les-affiches-de-la-saison-2025-2026.html) |

**Lacune:** competizioni giovani e piramidi delle Ligues/Districts non censite; la denominazione femminile non viene fissata senza una fonte regolamentare più precisa.

### 4.4 Volley (`Volley`)

**Organizzatori:** FFvolley per i campionati federali; LNV per il settore professionistico.

| Denominazione ufficiale | Tipo/segmento | Scope | Fonte 2025-2026 |
| --- | --- | --- | --- |
| `Marmara SpikeLigue`, `Saforelle Power 6`, `Ligue B Masculine` | competizioni professionistiche, rispettivamente maschile/femminile/maschile | nazionale | [LNV](https://www.lnv.fr/) e [pagina competizione LNV](https://lnv.fr/competitions/ligue-a-masculine) |
| `Élite Féminine`, `Élite Masculine` | competition federale senior distinta per genere | nazionale | [championnats nationaux FFvolley](https://ffvb.org/competitions/volley-ball/championnats-nationaux/), [RPE Élite Féminine 2025-2026](https://extranet.ffvb.org/data/Files/manuel_juridique/2025-2026/FFvolley_RPE_DEF_2025-26.pdf) |
| `Nationale 2 Féminine`, `Nationale 2 Masculine` | competition federale senior per genere | nazionale | [composizione poules 2025-2026](https://www.ffvb.org/data/Files/CCS/2025-2026/FFvolley_Poules_Nationales_2025-2026.pdf), [RPE N2F](https://extranet.ffvb.org/data/Files/manuel_juridique/2025-2026/FFvolley_RPE_N2F_2025-26.pdf) |
| `Nationale 3 Féminine`, `Nationale 3 Masculine` | competition federale senior per genere | nazionale | [poules nationales 2025-2026](https://www.ffvb.org/data/Files/CCS/2025-2026/FFvolley_Poules_Nationales_2025-2026.pdf) |

FFvolley pubblica separatamente i [championnats régionaux](https://www.ffvolley.org/competitions/volley-ball/championnats-regionaux/); nomi e livelli vanno quindi scoped alla Ligue, non copiati come identità nazionali.

**Lacune:** Coupe de France, competizioni giovani, beach-volley, para-volley e nomi di ciascuna divisione regionale non censiti.

### 4.5 Basket (`Basket`)

**Organizzatori:** FFBB per il sistema federale; LNB per `Betclic ÉLITE` ed `ÉLITE 2`. Il portale FFBB dichiara copertura nazionale, regionale e dipartimentale.

| Denominazione ufficiale | Segmento | Scope | Fonte |
| --- | --- | --- | --- |
| `Betclic ÉLITE`, `ÉLITE 2` | senior maschile professionistico | nazionale | [LNB](https://lnb.fr/fr), stagione 2026-2027 visibile sul portale |
| `Nationale Masculine 1`, `Nationale Masculine 2`, `Nationale Masculine 3` | senior maschile federale | nazionale | [calendriers FFBB](https://www.ffbb.com/calendriers), [portale competizioni FFBB](https://competitions.ffbb.com/) |
| `La Boulangère Wonderligue`, `Ligue Féminine 2` | senior femminile | nazionale | [calendriers FFBB](https://www.ffbb.com/calendriers) |
| `Nationale Féminine 1`, `Nationale Féminine 2`, `Nationale Féminine 3` | senior femminile federale | nazionale | [règlements FFBB](https://www.ffbb.com/reglements), stagione 2025-2026 |

**Territorio:** Ligues e comités gestiscono competizioni regionali/dipartimentali, consultabili nel [portale FFBB](https://competitions.ffbb.com/). Non viene assunto che una label regionale uguale in due Ligues rappresenti la stessa competition.

**Lacune:** categorie giovani, espoirs, Coupe de France, 3x3, basket entreprise e denominazioni territoriali non censite; la relazione gerarchica esatta tra ogni competition richiede i règlements particuliers.

### 4.6 Pallanuoto (`Pallanuoto`)

**Organizzatore:** FFN; articolazione tramite Ligues régionales e comités départementaux.

Il [Règlement annuel Water-Polo 2025-2026](https://www.ffnatation.fr/sites/default/files/2025-09/Re%CC%80glement%20Sportif%20Water-Polo%2025-26_0.pdf) e il [portale Water-Polo FFN](https://waterpolo.ffnatation.fr/) sono le fonti di riferimento. Le denominazioni verificate per il selector sono:

- `Élite Masculine` e `Élite Féminine` — competizioni senior nazionali distinte per genere;
- `Nationale 1 Masculine` — competizione senior nazionale ([pagina ufficiale](https://waterpolo.ffnatation.fr/fr/tournament/1280750/information));
- ulteriori `Nationale` maschili/femminili e competizioni giovani compaiono nel regolamento, ma devono essere estratte e revisionate per stagione prima di fissarne l'elenco completo.

**Lacune:** il presente audit non dichiara completa la sequenza N1/N2/N3, né le age class o le competizioni territoriali; servirà una tranche regolamentare dedicata.

### 4.7 Pallamano (`Pallamano`)

**Organizzatori:** FFHandball per il sistema federale; Ligue Nationale de Handball e Ligue Féminine de Handball per i settori professionali.

| Denominazione ufficiale | Segmento | Scope | Fonte |
| --- | --- | --- | --- |
| `Liqui Moly StarLigue`, `ProLigue` | senior maschile professionistico | nazionale | [Ligue Nationale de Handball](https://www.lnh.fr/) |
| `D1F`, `D2F` | senior femminile professionistico | nazionale | [calendrier général LFH 2025-2026](https://ligue-feminine-handball.fr/ressources-presse/saison-2025-26-calendrier-general-des-competitions-lfh-d1f-et-d2f-2/) |
| `Nationale 1 Masculine`, `Nationale 2 Masculine`, `Nationale 3 Masculine` | senior maschile federale | nazionale | [portale FFHandball 2025-2026](https://www.ffhandball.fr/competitions/saison-2025-2026-21/), [N1M](https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/poule-168258/) |
| `Nationale 1 Féminine`, `Nationale 2 Féminine`, `Nationale 3 Féminine` | senior femminile federale | nazionale | [portale FFHandball 2025-2026](https://www.ffhandball.fr/competitions/saison-2025-2026-21/) |

**Territorio:** il portale separa scope `national` e competizioni territoriali. Le label territoriali devono mantenere Ligue/comité e stagione.

**Lacune:** giovani, Coupe de France, ultramarino e liste complete territoriali non censiti.

### 4.8 Rugby (`Rugby`)

**Organizzatori:** FFR per le competizioni federali; LNR per Top 14/Pro D2. Questa ricerca privilegia il dilettantismo federale.

| Denominazione ufficiale | Segmento/scope | Evidenza 2025-2026 |
| --- | --- | --- |
| `Nationale`, `Nationale 2` | senior maschile nazionale | [livrets des compétitions FFR](https://www.ffr.fr/jouer-au-rugby/rugby_xv/livrets-des-competitions), [livret Nationale 2](https://api.www.ffr.fr/wp-content/uploads/2025/08/2025-2026_nationale-2_livret-de-la-competition.pdf) |
| `Fédérale 1`, `Fédérale 2`, `Fédérale 3` | senior maschile federale | [livrets FFR](https://www.ffr.fr/jouer-au-rugby/rugby_xv/livrets-des-competitions), [livret Fédérale 1](https://api.www.ffr.fr/wp-content/uploads/2025/08/2025-2026_federale-1_livret-de-la-competition.pdf) |
| `Élite 1 Féminine`, `Élite 2 Féminine`, `Fédérale 1 Féminine`, `Fédérale 2 Féminine` | senior femminile nazionale/federale | [règlements généraux FFR](https://www.ffr.fr/ffr/publications-officielles/reglements-generaux) e livrets stagione |
| `Régionale 1`, `Régionale 2`, `Régionale 3` | livelli/competizioni territoriali | organizzati dalle Ligues; denominazione da associare alla Ligue e stagione, non trattata come competition nazionale |

**Lacune:** Espoirs, Crabos, Alamercery, Gaudermen, Réserves, rugby à 7/à 10/à 5 e tutte le varianti territoriali non censite. Le age class non vengono dedotte dai nomi senza il regolamento pertinente.

### 4.9 Hockey su prato (`Hockey su prato`)

**Organizzatore:** Fédération Française de Hockey (FFH); portale federale `championnats.ffhockey.org`.

Il [calendario/risultati FFH](https://www.ffhockey.org/competitions/calendrier-et-resultats.html) e il [portale campionati](https://championnats.ffhockey.org/) attestano competizioni nazionali distinte per genere e stagione. Denominazioni documentate ma con copertura non ancora certificata completa:

- `Élite Masculine`, `Élite Féminine`;
- `Nationale 1 Masculine`, `Nationale 1 Féminine`;
- categorie nazionali ulteriori e hockey en salle: da estrarre separatamente dal portale/regolamenti prima dell'uso canonico.

**Lacune:** gerarchia completa, Nationale 2, giovani, sala, composizione delle zone/ligues e validità storica. Il portale ha risposto HTTP 403 all'automazione in parte della verifica: le pagine restano riferimenti da controllare manualmente, non vengono dichiarate assenti.

### 4.10 Hockey su ghiaccio (`Hockey su ghiaccio`)

**Organizzatore:** FFHG; la Synerglace Ligue Magnus ha anche un portale ufficiale dedicato.

| Denominazione ufficiale | Segmento | Fonte |
| --- | --- | --- |
| `Synerglace Ligue Magnus` | senior maschile, massima competition nazionale | [portale ufficiale](https://liguemagnus.com/) |
| `Division 1`, `Division 2`, `Division 3` | senior maschile nazionale | [portale compétitions FFHG](https://www.hockeyfrance.com/competitions/) e [D1](https://www.hockeyfrance.com/competitions/championnats-seniors/d1/) |
| championnat féminin | senior femminile | portale FFHG; denominazione e formula correnti da validare prima della materializzazione |
| `U20`, `U18`, `U15` | age class/competizioni giovani | portali nazionale e zone FFHG; non sono livelli senior |

La pagina D1 pubblica anche la stagione 2026-2027: [calendrier D1 2026/2027](https://www.hockeyfrance.com/competitions/2026/08/05/d1-le-calendrier-de-la-saison-2026-2027/).

**Lacune:** denominazione ufficiale completa del campionato femminile, categorie giovani inferiori, competizioni territoriali/zones e gerarchia promozione-retrocessione non consolidate.

### 4.11 Baseball (`Baseball`)

**Organizzatore:** FFBS; Commission Fédérale Sportive per le competizioni senior federali.

Denominazioni verificate sulla [Commission Fédérale Sportive FFBS](https://ffbs.fr/commission-federale-sportive/):

- `Division 1 Baseball`;
- `Division 2 Baseball`;
- `Division 3 Baseball`;
- `Championnat de France 12U`;
- `Championnat de France 15U`.

La stagione baseball usa l'anno civile nelle fonti consultate; esempio ufficiale: [Division 1 Baseball 2025](https://ffbs.fr/division-1-baseball-2025-le-calendrier-est-disponible/) e [portale FFBS/WBSC](https://ffbs.wbsc.org/fr/events/2025-championnat-de-france-division-1-baseball/home).

**Territorio:** le Ligues organizzano le qualificazioni/competizioni regionali; nessuna label regionale viene promossa senza fonte della Ligue.

**Lacune:** Challenge de France, competizioni giovani ulteriori, baseball féminin, overseas e sistemi regionali non censiti.

### 4.12 Softball (`Softball`)

**Organizzatore:** FFBS, ma con identità distinte dal Baseball.

Denominazioni verificate sulla [Commission Fédérale Sportive FFBS](https://ffbs.fr/commission-federale-sportive/):

- `Division 1 Féminine Softball`;
- `Division 2 Féminine Softball`;
- `Division 1 Masculine Softball`;
- `Division 2 Masculine Softball`;
- `Challenge de France Féminin de Softball`.

**Validità:** pagine correnti 2026 presenti sulla fonte; stagione ad anno civile.
**Lacune:** giovani, mixed/slowpitch, competizioni regionali e Challenge maschile non certificati in questa tranche.

### 4.13 Lacrosse (`Lacrosse`)

La fonte documentale individuata è **France Lacrosse / AFL**, con il [Championnat AFL](https://francelacrosse.org/championnat-afl). Il sito descrive un circuito nazionale, ma questa tranche non ha verificato:

- status giuridico e delega federale per la stagione corrente;
- rapporto formale con FFBS o altra federation;
- separazione completa maschile/femminile;
- gerarchia di livelli;
- calendario/season versionato idoneo al catalogo.

**Decisione prudenziale:** `Championnat AFL` è una competition candidate documentata, non un livello e non una prova di federation hierarchy. Copertura **fortemente parziale**.

### 4.14 Football americano (`Football americano`)

**Organizzatore:** FFFA; articolazione territoriale tramite ligues. Football américain e flag restano discipline/circuiti distinti.

Denominazioni documentate dalle pagine FFFA:

- `Championnat Élite` / `D1` — senior maschile nazionale: [archive ufficiale](https://www.fffa.org/football-americain/championnat-elite/);
- `D2` e `D3` — competizioni nazionali/federali: [comunicato calendari D1/D2](https://www.fffa.org/federation/championats-les-calendriers-de-la-d1-et-de-la-d2-devoiles/);
- challenge/competizione femminile — esistenza documentata nei canali FFFA, ma denominazione e formula da verificare nel regolamento corrente;
- `D1` e `D2` di flag — **flag football**, non categorie del football americano: [calendriers flag FFFA](https://www.fffa.org/flag/les-calendriers-du-flag-sont-disponibles/).

**Lacune:** nome ufficiale corrente associato ai trofei (`Casque de Diamant` ecc.), struttura femminile, U20/U17, competizioni territoriali e stagione 2026-2027. Alcune pagine FFFA rispondono HTTP 403 all'automazione e richiedono review manuale.

## 5. Matrice di copertura

| Sport UI | Federation/organizer | Senior M | Senior F | Giovani | Territorio | Copertura complessiva |
| --- | --- | --- | --- | --- | --- | --- |
| Calcio | sì | buona nazionale | parziale | parziale nazionale | struttura sì, nomi no | **parziale utile** |
| Calcio a 8 | sì | practice territoriale | non separato | parziale | parziale | **parziale** |
| Futsal | sì | buona nazionale | incompleta | mancante | struttura sì | **parziale utile** |
| Volley | sì | buona nazionale | buona nazionale | mancante | struttura sì | **parziale utile** |
| Basket | sì | buona nazionale | buona nazionale | mancante | struttura sì | **parziale utile** |
| Pallanuoto | sì | parziale | parziale | mancante | struttura sì | **parziale** |
| Pallamano | sì | buona nazionale | buona nazionale | mancante | struttura sì | **parziale utile** |
| Rugby | sì | buona federale | parziale federale | mancante | livelli generali sì | **parziale utile** |
| Hockey su prato | sì | parziale | parziale | mancante | incompleto | **parziale** |
| Hockey su ghiaccio | sì | buona senior | incompleta | age class parziali | zones non censite | **parziale utile** |
| Baseball | sì | buona senior | incompleta | 12U/15U parziale | struttura sì | **parziale utile** |
| Softball | sì | buona | buona | mancante | struttura sì | **parziale utile** |
| Lacrosse | circuito sì | parziale | non verificato | mancante | mancante | **fortemente parziale** |
| Football americano | sì | parziale utile | incompleta | mancante | struttura sì | **parziale** |

Nessuna riga autorizza la dicitura “copertura completa”. In particolare, la copertura dilettantistica territoriale richiederà fonti scoped alle singole Ligues/Districts/Comités, senza censire in questa fase ogni girone locale.

## 6. Implicazioni per i futuri selettori

1. Il selector deve filtrare prima per Sport e Paese, poi distinguere organizer/circuito.
2. Una stessa label (`Division 1`, `Nationale 1`, `Élite`) non è condivisa automaticamente tra Sport, genere o organizer.
3. Genere e age class sono attributi/relazioni distinti dalla competition identity.
4. Le competizioni territoriali devono conservare l'organizzatore territoriale; una label senza Ligue/District è ambigua.
5. `Calcio a 8` è practice/variant e non eredita la piramide del calcio a undici.
6. Flag football non viene inserito sotto Football americano senza una futura decisione Discipline/Variant.
7. I nomi francesi restano in lingua originale; le traduzioni UI, se future, saranno metadata separati.
8. Le liste italiane correnti restano compatibili e non vengono sostituite da questa ricerca.

## 7. Riuso/importazione: valutazione separata

| Domanda | Esito di questa attività |
| --- | --- |
| Le denominazioni e strutture sono documentabili da fonti ufficiali? | **SÌ, con copertura parziale dichiarata** |
| Sono state copiate liste di squadre/risultati/calendari? | **NO** |
| Esiste un dataset uniforme per tutti gli Sport? | **NON ACCERTATO / non richiesto per la ricerca documentale** |
| Licenza/database rights verificati? | **NO** |
| Stable source record ID verificati? | **NO** |
| Pronto per manifest automatico/seed/import? | **NO — richiede gate separato per fonte** |
| Può informare il design e la review dei selector? | **SÌ** |

Il `NO` all'import non invalida l'elenco documentale e non blocca la gestione legacy delle categorie nell'app.

## 8. Stato operativo e stop gate

| Voce | Stato |
| --- | --- |
| Documento Francia | creato |
| Applicazione/API/UI | non modificate |
| Migration/seed/import/backfill | no / no / no / no |
| Preview/Production | non interrogate e non modificate |
| RLS/grant/ownership/Applications | non modificati |
| Nuovo censimento di squadre/gironi | non eseguito |
| Francia pronta per review | sì, con lacune sopra |
| Spagna/Svizzera/Slovenia/Polonia | **non iniziate** |

**Stop gate:** non estendere la ricerca alla Spagna prima della review umana del livello di dettaglio Francia. La review deve controllare soprattutto Pallanuoto, Hockey su prato, Lacrosse e Football americano, le cui coperture sono più deboli, e confermare se per il prodotto siano necessarie anche coppe e categorie giovanili territoriali.
