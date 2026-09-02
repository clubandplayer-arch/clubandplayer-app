# FASE 4G — Preferenza lingua

## Stato

**IMPLEMENTATA — test automatici PASS; VERIFICA MANUALE PREVIEW RICHIESTA prima della chiusura.**

La fase certifica l'integrazione tra selettore lingua, catalogo client, cookie e preferenza autenticata. Completa inoltre la correzione degli sport segnalata nello smoke 4F: tutte le option Web mostrano la traduzione ma continuano a inviare il valore legacy atteso dalle API.

## Contratto di precedenza

La risoluzione server resta invariata e deterministica:

1. preferenza del profilo autenticato;
2. cookie `cp_locale`;
3. `Accept-Language` del browser;
4. italiano.

Solo IT, EN, FR ed ES attive possono essere persistite. La preferenza lingua aggiorna esclusivamente `preferred_language_id` e non può modificare residenza o mobilità.

## Consolidamento dello switcher

- Le selezioni vengono serializzate: durante il salvataggio pulsante e voci sono disabilitati.
- Il bottone espone `aria-busy` durante la persistenza.
- Catalogo e cookie vengono aggiornati immediatamente.
- Se la preferenza autenticata fallisce, UI e cookie tornano alla lingua precedente, coerentemente con la precedenza server.
- Il messaggio di errore descrive il rollback in tutte le lingue attive.
- Utenti anonimi continuano a usare il cookie annuale `SameSite=Lax`.

## Sport nei selettori

Profilo Player/Club, esperienze pregresse, interessi, Opportunity e ricerca mostrano ora gli sport localizzati. L'attributo `value` delle option resta `Calcio`, `Calcio a 8`, `Pallanuoto`, ecc.: nessun dato, filtro o payload viene migrato.

## Compatibilità

- Nessuna migration e nessuna modifica RLS.
- Nessun endpoint o payload modificato.
- Nessuna modifica ai valori sportivi persistiti.
- Nessuna modifica Mobile; parity rinviata alla repository Mobile.

## Verifica manuale Preview richiesta

1. In Español aprire `/player/profile`: il menu sport deve mostrare `Fútbol`, `Fútbol 8`, `Fútbol sala`, `Voleibol`, `Baloncesto`, `Waterpolo`, `Balonmano`, `Rugby`, `Hockey sobre césped`, `Hockey sobre hielo`, `Béisbol`, `Sóftbol`, `Lacrosse`, `Fútbol americano`.
2. Controllare lo stesso menu nelle esperienze pregresse; salvare e ricaricare verificando che la selezione resti corretta.
3. Ripetere in English e Français, verificando almeno Football/Volleyball/Basketball e Football/Volley-ball/Basket-ball.
4. Cambiare lingua rapidamente: durante il salvataggio non devono partire selezioni concorrenti.
5. Ricaricare e aprire una nuova pagina: la lingua scelta deve persistere per account autenticato.
6. Effettuare logout e verificare il comportamento cookie anonimo; al login deve prevalere la preferenza profilo.
7. Simulare offline durante un cambio: deve tornare la lingua precedente e comparire l'errore localizzato.
8. Console/Network: nessun errore hydration, loop o risposta 500.

## Criterio di chiusura

La FASE 4G può essere marcata **COMPLETATA / PASS** dopo lo smoke di persistenza e rollback. Fino ad allora 4H non è autorizzata implicitamente.
