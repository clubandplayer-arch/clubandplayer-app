# FASE 3C-D5 — International ranking e relocation

## Stato

**IMPLEMENTATA — test automatici PASS; verifica manuale Preview richiesta.** D6 resta bloccata fino al PASS dello smoke D5.

## Ranking attivato

Discover e WhoToFollow applicano ora il contratto D2 al pool di candidati già visibile e già autorizzato. L'ordinamento usa una sola reason geografica più forte, sport e relocation, quindi tie-break stabile per priority dell'interesse, `updated_at` e UUID.

La precedenza delle reason è:

1. area canonica;
2. country canonico;
3. area legacy;
4. country legacy;
5. sport come segnale additivo;
6. relocation compatibile come segnale additivo.

L'assenza di geografia canonica non sottrae punti e non esclude il candidato. Quote, visibility, self/already-followed exclusions e fallback D4 restano invariati.

## Relocation

`relocation_compatible` è vero soltanto quando il viewer ha `open_to_relocation=true`, il candidato soddisfa un interesse geografico esplicito, esiste un country di residenza noto e il country pubblico del candidato è differente dalla residenza. Non viene inferito da dati mancanti, nationality o birth country e non modifica alcun dato persistito.

## Perimetro

Nessuna migration, write, backfill, modifica RLS/grant, service role, UI reason label, Maps, mobile o file binario. Le reason rimangono interne; il debug espone soltanto `rankingVersion=d5-v1`.

## Verifica manuale Preview richiesta

1. Aprire due volte `/api/follows/suggestions?limit=5&debug=1&geoScope=country`: HTTP 200, stessi ID nello stesso ordine e `rankingVersion=d5-v1`.
2. Aprire due volte `/api/suggestions/who-to-follow?limit=5&debug=1`: HTTP 200, stessi ID nello stesso ordine e `rankingVersion=d5-v1`.
3. Verificare che self e `sampleExcluded` non compaiano nei risultati.
4. Aprire `/discover` e il widget feed WhoToFollow: card, avatar, link e Follow devono funzionare senza errori Network/Console.
5. Se disponibile un viewer con interessi canonici, verificare che `hasCanonicalGeographyInterests=true` e che candidati pertinenti precedano fallback non pertinenti.
6. Se disponibile un viewer relocation, verificare `openToRelocation=true`; il ranking non deve includere target esteri non collegati a un interesse esplicito.
7. Ripetere con il viewer legacy già usato in D4: deve continuare a ricevere risultati e non essere penalizzato dall'assenza di interessi canonici.

## Next gate

**Non iniziare D6.** D5 diventa COMPLETATA / PASS soltanto dopo lo smoke Preview autenticato.
