# Audit registrazione e visibilità Club — 18 settembre 2026

## Sintomi riprodotti

1. Un account Club appena registrato poteva raggiungere `/feed` senza avere completato il profilo.
2. Un post poteva mostrare nome e avatar del Club, ma il tap sul nome apriva `/clubs/<auth-user-id>` e restituiva 404.
3. Nome, geografia canonica e iscrizione potevano essere presenti, mentre il profilo restava `draft` e quindi non era leggibile dalla pagina pubblica.

## Cause radice

### Deviazione nel middleware

I redirect da `/login`, `/signup` e `/onboarding/choose-role` decidevano tra onboarding e feed usando soltanto il ruolo. Questi rami venivano eseguiti prima del controllo generale di completezza e permettevano quindi a un Club incompleto di entrare nel feed.

### Due definizioni incompatibili di “profilo completo”

Il client e `whoami` valutavano soltanto colonne di `profiles`; il database pubblicava il profilo con un trigger basato sui vecchi campi geografici e sul vecchio campo `sport`. Nessuno dei due considerava l'iscrizione attiva, anche se il flusso Club corrente salva geografia in `profile_preferences` e sport/campionato in `club_sport_registrations`.

Inoltre, la creazione o modifica di una preferenza geografica o di un'iscrizione non rivalutava `profile_visibility_status`, perché il trigger era collegato soltanto alla tabella `profiles`.

### Confusione tra ID autenticazione e ID profilo

`posts.author_id` contiene l'ID di `auth.users`. Se il profilo autore non era leggibile — situazione normale per un profilo `draft` — le card usavano quell'ID come fallback nell'URL pubblico. Le pagine `/clubs/[id]` cercano invece `profiles.id`, perciò il link era strutturalmente errato e produceva 404.

## Contratto corretto

Un Club è completo e pubblicabile soltanto quando possiede:

- una denominazione societaria valida;
- una geografia completa: geografia canonica con Paese e area, oppure il percorso legacy completo;
- almeno un'iscrizione sportiva attiva;
- stato account `active` e nessun rifiuto/sospensione amministrativa.

Il middleware usa lo stesso contratto applicativo per impedire l'accesso al feed. Il database usa gli stessi segnali per impostare `profile_visibility_status`, e rivaluta il profilo quando cambiano geografia o iscrizioni.

## Correzioni e compatibilità

- I redirect iniziali rispettano `profile.is_complete` e portano al percorso di completamento specifico del ruolo.
- `whoami` carica geografia canonica e iscrizioni attive per i Club.
- Il form consente il salvataggio intermedio della geografia, necessario prima di poter creare un'iscrizione, ma continua a indicare l'iscrizione come requisito mancante.
- La migrazione riallinea anche i Club già esistenti, così i profili completi rimasti erroneamente in bozza vengono rivalutati.
- Le card del feed generano un link soltanto quando dispongono di un vero `profiles.id`; non reinterpretano più `auth.users.id`.

## Verifica operativa dopo il deploy

1. Applicare la migrazione `20261217120000_align_club_onboarding_publication.sql`.
2. Registrare un nuovo account, scegliere Club e verificare il redirect immediato a `/club/profile`.
3. Verificare che `/feed` continui a reindirizzare a `/club/profile` finché mancano geografia o iscrizione.
4. Salvare nome e geografia, creare un'iscrizione attiva e verificare che `profiles.profile_visibility_status` diventi `published`.
5. Aprire il feed con un secondo account, fare tap sull'autore e verificare che l'URL contenga `profiles.id` e apra il profilo pubblico.
