# FASE 4F — Español

## Stato

**COMPLETATA / PASS — smoke Preview confermato dall'utente; localizzazione degli sport estesa a tutti i selettori nella candidate 4G.**

La baseline spagnola consolida le superfici Web prioritarie e chiude il residuo cross-locale mostrato nello smoke 4E: sport, genere e categorie provenienti dal database restavano in italiano anche con UI inglese, francese o spagnola.

## Correzione del vocabolario controllato

Il valore persistito non viene modificato. La UI normalizza alias legacy e traduce soltanto in presentazione:

- i 14 sport supportati, incluso `Calcio` → `Fútbol`;
- genere Opportunity, incluso `Uomo` → `Hombres`;
- categorie legacy comuni, incluso `Terza Categoria` → `Tercera Categoría`;
- valori sconosciuti mostrati invariati, senza mapping inventati.

La stessa correzione vale in inglese e francese (`Football / Men / Third Division`, `Football / Hommes / Troisième division`) e viene usata nel dettaglio Opportunity, nella card e nella tabella. Titolo e descrizione degli annunci restano contenuti creati dagli utenti e non vengono tradotti automaticamente.

## Revisione editoriale spagnola

- `Solo Jugadores y Cuerpo técnico` sostituisce la forma ibrida con slash.
- `Rol o posición` e `Nombre del Club o del equipo` rendono esplicite le alternative.
- L'esempio di ricerca usa `Madrid`.
- `Gestionar o ver todas las oportunidades` elimina lo slash editoriale.
- `Información sobre la versión beta` chiarisce l'etichetta.

## Compatibilità

- Nessuna migration, query, modifica RLS o modifica ai dati esistenti.
- Nessuna modifica a endpoint o payload.
- Le nuove chiavi sono presentazionali e mantengono parità tra IT/EN/FR/ES.
- Nessuna modifica Mobile; la parity resta rinviata alla repository Mobile.

## Verifica manuale Preview richiesta

Usare **Español** con un account Player:

1. Aprire un dettaglio Opportunity con valori legacy `Calcio`, `Uomo`, `Terza Categoria`: devono apparire `Fútbol`, `Hombres`, `Tercera Categoría` sia nei badge sia nei requisiti.
2. Verificare che ruolo, status e account type restino tradotti; titolo e descrizione inseriti dall'utente devono invece restare invariati.
3. Controllare `/opportunities`, card e tabella per sport/categorie tradotti e assenza di regressioni responsive.
4. Controllare `/applications`, `/network`, ricerca, Feed e `/profile/location-settings` per copy spagnolo coerente.
5. Cambiare Español → Français → English → Español: i valori controllati devono cambiare lingua senza modificare l'annuncio.
6. DevTools Console/Network: nessun errore hydration, loop o risposta 500.

## Criterio di chiusura

La FASE 4F è **COMPLETATA / PASS** dopo la conferma dello smoke. La FASE 4G è stata autorizzata esplicitamente e completa la localizzazione delle option senza cambiare i valori salvati.
