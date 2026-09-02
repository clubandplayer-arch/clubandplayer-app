# FASE 4H — Metadata e SEO

## Stato

**IMPLEMENTATA — test automatici PASS; VERIFICA MANUALE PREVIEW RICHIESTA prima della chiusura.**

## Correzioni UI incluse

Lo smoke 4G ha individuato valori ancora hardcoded. La candidate corregge stato e CTA candidatura, zona di interesse, tab media, helper del composer, rimozione esperienza e tutti i ruoli Staff legacy nei menu, mantenendo invariati i valori salvati.

Titoli, biografie e descrizioni creati dagli utenti restano intenzionalmente nella lingua in cui sono stati scritti.

## Metadata localizzati

Un builder server-side per IT/EN/FR/ES produce titolo, description, Open Graph e Twitter coerenti con il locale risolto. Sono coperti metadata globali, login, registrazione, Rete e Mappa dei Club.

`<html lang>` continua a seguire la lingua risolta. Open Graph usa `it_IT`, `en_GB`, `fr_FR` o `es_ES` e dichiara gli altri locale disponibili.

Non vengono emessi `hreflang` falsi: l'app non dispone di URL distinti per lingua. I canonical restano univoci e stabili.

## Compatibilità

- Nessuna migration, query o modifica RLS.
- Nessuna modifica a API, payload o route.
- Nessuna indicizzazione di contenuti privati aggiunta.
- Nessuna modifica Mobile.

## Verifica manuale Preview richiesta

1. Ripetere gli screenshot in FR ed ES: badge candidatura, zona di interesse, media, helper composer, rimozione esperienza e ruoli Staff devono essere tradotti.
2. Nei ruoli Staff verificare almeno Presidente, Direttore generale, Secondo allenatore/Entraîneur adjoint, Preparatore fisico/Préparateur physique e Responsabile stampa/Attaché de presse.
3. Ispezionare home, `/login`, `/signup`, `/network`, `/club-map` in ogni lingua: title, description e `og:locale` devono corrispondere.
4. Verificare canonical unico per route e assenza di alternate language URL inventati.
5. Condividere una URL Preview in un debugger Open Graph, se accettata, e verificare immagine e titolo.
6. Console/Network: nessun errore hydration, loop o risposta 500.

## Criterio di chiusura

La FASE 4H può essere marcata **COMPLETATA / PASS** dopo lo smoke UI e metadata. Fino ad allora 4I non è autorizzata implicitamente.
