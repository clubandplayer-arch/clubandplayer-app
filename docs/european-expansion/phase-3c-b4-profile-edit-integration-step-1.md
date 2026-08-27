# FASE 3C-B4.4 — Profile Edit integration — Step 1

## Stato

**IN PROGRESS — STEP 1 CODE-ONLY E VALIDAZIONE VISIVA COMPLETATI; WRITE REMOTI DISABILITATI.**

La nuova decisione esplicita del 2026-08-26 autorizza B4.4 Step 1 sul solo branch di lavoro mentre il ticket Supabase relativo al Preview Branch `b4-rpc-validation` resta aperto. La certificazione Supabase e il read-after-write reale restano gate obbligatori prima della chiusura di B4.4.

## Perimetro implementato

- endpoint owner-only `GET/PATCH /api/profiles/me/residence`;
- integrazione controllata di `CanonicalGeographySelector` in `ProfileEditForm` solo per Player/Athlete e Staff;
- semantiche `absent`, `reset`, `country_only` e `full` affidate al contratto B4.2;
- rimozione dei default impliciti a `IT` e dei campi residence legacy dal payload Player/Staff del client;
- pagina temporanea fixture-only e `noindex` usata per la validazione e successivamente rimossa;
- feature gate distinti per visibilità UI e write server.

Club, Institution e Fan restano esclusi e i relativi flussi non sono stati collegati al nuovo endpoint.

## Sicurezza e feature gate

Entrambi i gate sono `false` per default:

- `NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED`: rende visibile l'integrazione reale;
- `CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED`: kill switch server-side verificato prima di query o invocazioni RPC nel PATCH.
- `CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS`: allowlist temporanea B4.4, composta esclusivamente da UUID `auth.users` separati da virgola; una configurazione assente o non valida nega tutte le scritture.

Con la configurazione predefinita nessuna RPC residence può essere invocata dal nuovo endpoint. La pagina QA ha usato esclusivamente fixture in memoria, senza letture profilo, client Supabase o azioni di salvataggio; è stata rimossa dopo l’approvazione.

## Contratto owner-only

`GET` e `PATCH` usano l'autenticazione server esistente e ricavano il profilo da `auth.uid()`. Non accettano `profile_id`. Sono ammessi soltanto `athlete` e `staff`; altri account type ricevono `403`. Il `PATCH` riceve soltanto:

```json
{
  "geography": {
    "residenceCountryId": "uuid-or-null",
    "residenceGeoAreaId": "uuid-or-null"
  }
}
```

Il client non invia ID o label legacy, interessi, nazionalità, Paese di nascita o relocation.

## Stato del salvataggio reale

Nessuna migration è stata applicata e nessuna query o write remota è stata eseguita durante questo step. Il Preview Branch Supabase resta unhealthy; il ticket supporto resta aperto. Il salvataggio reale e la rilettura canonical-first non sono certificati.

## Validazione Step 1

**VALIDAZIONE VISIVA: PASS — approvata dall’utente il 2026-08-26.** Sono stati verificati Player/Athlete e Staff, i sei Paesi, CH con e senza District, country-only, reset completo, loading, errore/retry, ID canonici distinti, write disabilitato e layout responsive. La pagina QA temporanea è stata rimossa dopo il gate.

I test deterministici coprono:

- gate UI/write disabilitati per default;
- endpoint owner-only e ruoli ammessi/esclusi;
- contratto absent/reset/country-only/full;
- UUID, mapping IT, gerarchie estere e rollback simulato;
- assenza di default implicito `IT`;
- assenza di payload residence legacy Player/Staff;
- selector controllato, profondità variabile e District svizzero opzionale;
- il feature gate che impedisce write remoti reali.

## Gate residui obbligatori

B4.4 non può essere completata finché non sono superati:

1. certificazione della migration/RPC su Supabase isolato o nel deployment finale approvato;
2. test Player e Staff autenticati sul form reale;
3. reset, country-only, IT e Paesi esteri con dati canonici reali;
4. write atomico e read-after-write canonical-first;
5. compatibilità legacy italiana, privacy e autorizzazioni owner;
6. conferma che Club, Institution e Fan restino esclusi.

La pagina QA temporanea è stata rimossa. B4 e FASE 3C-B restano **NOT COMPLETED**; B4.5/B5 non sono iniziate.
