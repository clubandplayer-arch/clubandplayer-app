# Audit società visibili nel perimetro Club & Player

_Data audit: 12 giugno 2026._

## Obiettivo

Determinare quante società del master registry sono effettivamente nel perimetro Club & Player perché hanno almeno uno sport presente nella lista sport dell'app. Il master locale contiene **44.411** società, ma solo una parte è visibile nelle ricerche utenti perché l'endpoint pubblico scarta le società senza discipline C&P.

## Fonti e metodo

- Fonte dati: `imports/registry/registry_clubs_master_geo.csv`, colonna `sport_normalizzati`.
- Logica applicativa verificata: `app/api/registry/clubs/search/route.ts` espone solo le discipline che, dopo normalizzazione/alias, sono dentro `ALLOWED_SPORTS` e rimuove le righe senza discipline visibili.
- Sport C&P considerati nell'audit: Calcio, Calcio a 8, Futsal, Volley, Basket, Pallanuoto, Pallamano, Rugby, Hockey su prato, Hockey su ghiaccio, Baseball, Softball, Lacrosse, Football americano.
- Nel master importato gli sport sono tokenizzati in modo più aggregato rispetto alla UI. In particolare:
  - `calcio` copre Calcio, Futsal e Calcio a 8;
  - `hockey` viene trattato dall'API come Hockey su prato tramite alias, anche quando la disciplina originale può essere hockey inline/pista/subacqueo;
  - `baseball` copre il bucket Baseball/Softball.
- Le forme societarie **ASD/SSD/etc.** sono dedotte dalla `denominazione`, perché il master aggregato non espone una colonna di forma giuridica normalizzata.
- Script riproducibile: `node scripts/audit-cp-visible-clubs.mjs`.

## Risultato principale

| Metrica | Numero | Quota sul master |
| --- | ---: | ---: |
| Società nel master registry | 44.411 | 100,0% |
| Società con almeno uno sport C&P visibile | **18.920** | **42,6%** |
| Società fuori perimetro C&P | 25.491 | 57,4% |

## Breakdown per sport/token visibile

> Nota: una società multisport può comparire in più righe, quindi le quote per sport non sommano a 100%.

| Sport/token C&P | Società | Quota sulle 18.920 visibili |
| --- | ---: | ---: |
| Calcio / Futsal / Calcio a 8 | 13.230 | 69,9% |
| Basket | 4.915 | 26,0% |
| Volley | 4.402 | 23,3% |
| Pallanuoto | 909 | 4,8% |
| Rugby | 896 | 4,7% |
| Hockey | 788 | 4,2% |
| Pallamano | 281 | 1,5% |
| Baseball / Softball | 120 | 0,6% |

## Breakdown ASD, SSD e altre forme dedotte

| Forma dedotta dalla denominazione | Società | Quota sulle 18.920 visibili |
| --- | ---: | ---: |
| ASD esplicita | **13.873** | **73,3%** |
| Associazione/club senza ASD esplicita | 1.782 | 9,4% |
| Forma non deducibile dalla denominazione | 1.677 | 8,9% |
| SSD esplicita | **1.437** | **7,6%** |
| Società/impresa non SSD esplicita | 136 | 0,7% |
| ASD + SSD esplicite | 15 | 0,1% |

### Lettura sintetica

- Nel perimetro C&P visibile ci sono **13.888 denominazioni con ASD esplicita** se si sommano `ASD esplicita` e `ASD + SSD esplicite`.
- Nel perimetro C&P visibile ci sono **1.452 denominazioni con SSD esplicita** se si sommano `SSD esplicita` e `ASD + SSD esplicite`.
- Le restanti **3.580** società visibili non hanno una sigla ASD/SSD chiara nella denominazione oppure sono associazioni/club/società non etichettabili con certezza dalla sola ragione sociale.

## Prime regioni per società C&P visibili

| Regione | Società visibili |
| --- | ---: |
| Lombardia | 2.774 |
| Campania | 1.776 |
| Emilia-Romagna | 1.729 |
| Veneto | 1.713 |
| Lazio | 1.428 |
| Toscana | 1.424 |
| Sicilia | 1.389 |
| Piemonte | 1.221 |
| Puglia | 1.081 |
| Sardegna | 712 |

## Osservazioni operative

1. **Il dato utile per C&P non è 44k ma circa 18,9k società**: questo è il bacino realmente coerente con gli sport attualmente supportati e mostrabili agli utenti.
2. **Il calcio è sovra-aggregato**: il master espone `calcio`, mentre la UI distingue Calcio, Calcio a 8 e Futsal. Per report commerciali o filtri accurati serve mantenere anche una mappatura per disciplina grezza.
3. **Hockey rischia falsi positivi**: l'API converte il token `hockey` in Hockey su prato, ma il master include discipline come hockey subacqueo, inline e pista. Se C&P vuole solo prato/ghiaccio, va raffinata la normalizzazione.
4. **ASD/SSD è una stima testuale**: per una certificazione legale/commerciale va importata o normalizzata una colonna di forma giuridica, perché la sola denominazione non basta per distinguere tutti i casi.
