# FASE 3C-D6 — UI e scouting internazionale

## Stato

**IMPLEMENTATA — test automatici PASS; verifica manuale/visiva Preview richiesta.** D7 resta bloccata fino al PASS dello smoke D6.

## Implementazione

- `/discover` usa il selector geografico canonico condiviso per scegliere un Paese supportato e, facoltativamente, un'area a profondità variabile.
- La selezione è persistita nella URL con `countryId` e `geoAreaId`, è ripristinabile al reload ed è inviata a tutte le richieste per Institution, Club, Player e Staff.
- In assenza di una selezione esplicita restano attivi interessi/residence del viewer e il controllo del livello personalizzato D4.
- L'endpoint suggerimenti valida UUID, country supported/active, area active e same-country prima delle query. Country e area selezionati sono filtri stretti; non viene eseguito fallback fuori territorio.
- Rimossi il copy “Tutta Italia” e gli altri testi hardcoded del pannello; copy e reason label sono localizzati in IT/EN/FR/ES.
- Le card mostrano soltanto reason label non sensibili: corrispondenza con l'area scelta oppure suggerimento basato sugli interessi. Score, priority, relocation e preferenze private non sono esposti.
- I tab espongono `aria-pressed`; il selector conserva label, associazioni form, stato loading/error/retry e reset accessibili.

## Perimetro

Nessuna migration, write, backfill, modifica RLS/grant, service role, Maps, mobile o file binario. D6 non cambia i pesi D5 e non introduce reason dettagliate sensibili.

## Verifica manuale/visiva Preview richiesta

1. Aprire `/discover`: nessun Paese deve essere preselezionato implicitamente e non deve comparire “Tutta Italia”.
2. Selezionare Francia e Auvergne-Rhône-Alpes; verificare che la URL contenga `countryId` e `geoAreaId` e che il reload mantenga la selezione.
3. Su Club e Player verificare che i risultati abbiano location Francia/area selezionata; una lista vuota è valida, un risultato italiano no.
4. Cambiare Paese: l'area precedente deve azzerarsi. Usare “Azzera selezione”: URL e selector devono tornare al personalizzato.
5. Verificare Institution e Staff, quindi sport “mio” e “tutti”.
6. Controllare card, avatar, link, Follow, reason label, tab da tastiera e focus del selector.
7. Controllare Network: richieste HTTP 200 con `countryId`/`geoAreaId`; nessun `UNKNOWN` o 500. Console senza errori inattesi.
8. Cambiare lingua tra IT/EN/FR/ES e verificare titolo, help, filtri, empty state e reason label.

## Next gate

**Non iniziare D7.** D6 diventa COMPLETATA / PASS soltanto dopo conferma dello smoke Preview.
