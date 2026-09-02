# FASE 5F — Gate di installazione per profili ed esperienze

## Stato

**FASE 5F: AUDIT / BLOCCATA prima del collegamento runtime.**

Il collegamento di `/api/profiles/me`, `/api/profiles/me/experiences` e dei relativi form richiede che Preview disponga delle colonne e dei cataloghi creati in 5C/5D. Collegare prima il codice produrrebbe errori Data API sulle colonne inesistenti.

## Azione richiesta adesso

Applicare **nell'ambiente Preview destinato allo smoke, non automaticamente in Production**, nell'ordine:

1. `supabase/migrations/20261206120000_sports_competition_canonical_schema.sql`;
2. `supabase/migrations/20261206130000_sports_competition_controlled_seed.sql`.

Non invertire l'ordine: 5D dipende dalle tabelle 5C. Non eseguire backfill e non modificare manualmente profili, esperienze, Opportunities o Applications.

Se Preview usa lo stesso database di Production o non è dimostrabilmente isolata, **non applicare nulla** e comunicarlo prima di procedere.

## Esito da comunicare

Per ciascuna migration indicare soltanto:

- ambiente/branch database target;
- esito success/failure;
- messaggio di errore completo, se presente;
- conferma che nessun backfill o SQL aggiuntivo è stato eseguito.

Dopo la conferma verranno preparate query read-only di verifica per schema, conteggi seed e ACL prima di collegare il runtime 5F.

## Stato tecnico

- Migration create: **sì, 5C e 5D**;
- migration testate: **sì, PostgreSQL 16.15 locale**;
- migration applicate remotamente: **non confermato**;
- Production interrogata/modificata: **no/no**;
- RLS/grant/ownership/Applications in questo checkpoint: **non modificati**;
- Web/API/Mobile in questo checkpoint: **non modificati**;
- test automatici aggiuntivi: non applicabili, modifica solo documentale;
- smoke manuale: non ancora eseguibile.
