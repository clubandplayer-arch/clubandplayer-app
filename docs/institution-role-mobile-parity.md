# Ente Istituzionale — note implementative e parity mobile

## Ambito web implementato
- Nuovo ruolo `institution` con label utente `Ente Istituzionale`.
- Selezionando il ruolo in onboarding, l'utente viene inviato a `/institution/verification`.
- Form verifica ente: tipologia ente, Nome ente, CF, P.IVA, Email, PEC, Sito, Referente, Documento.
- Documenti ammessi: `Visura` oppure `Certificato P.IVA o CF rilasciato da AdE`.
- Tipologie ente ammesse: Federazione, EPS, Comitato Regionale, Comitato Provinciale, Delegazione, Lega.
- Nuovo tab `ENTE` prima di `Club` in `/discover` e `/following`.
- Gli Enti in `/following` sono ordinati alfabeticamente.

## Da replicare su mobile
- Aggiungere il ruolo `institution`/`Ente Istituzionale` nella scelta ruolo.
- Reindirizzare subito alla schermata mobile di verifica ente.
- Replicare campi, validazioni, document types e tipologie ente del form web.
- Usare gli endpoint `/api/institution/verification/status`, `/upload`, `/submit`.
- Aggiungere il tab `ENTE` prima di `Club` in Discover e Following mobile, con ordinamento alfabetico per gli Enti seguiti.
