# Allineamento Club&Player al modello LinkedIn

Questo documento raccoglie una revisione complessiva dell'app con la lente "LinkedIn per sportivi" e propone uno schema di interventi prioritari.

## 1. Profili Player (equivalente profili personali)
**Stato attuale**
- La pagina `/athletes/[id]` mostra header, bio e feed, ma mancano sezioni strutturate tipo "Esperienze", "Statistiche", "Media" e un blocco "Open to opportunities" con preferenze.
- La copertura dei campi di località e ruolo è minimale; non esiste una cover image.

**Gap rispetto a LinkedIn**
- Assenza di sezioni cronologiche per esperienze sportive e risultati.
- Nessuna distinzione tra ruolo corrente e storia delle squadre.
- Mancano highlight multimediali (video highlight, foto) e indicatori "Open to opportunities".

**Interventi proposti (Step 1)**
- Modellare sezioni "Esperienze sportive" e "Statistiche" usando tabelle dedicate (o viste su dati esistenti) e componenti riutilizzabili.
- Aggiungere header con cover opzionale, avatar grande, nome, ruolo, località e headline sintetica.
- Integrare un pannello "Open to opportunities" con preferenze (ruolo, livello, aree geografiche) e stato attivo.
- Rendere il feed pubblico parte della pagina ma separato da un riepilogo profilo chiaro.

## 2. Profili Club (equivalente company page)
**Stato attuale**
- `/clubs/[id]` espone header, pulsante Segui e feed, ma non presenta sezioni About, settore/sport, informazioni di contatto o blocco di opportunità aperte.

**Gap**
- Mancano informazioni strutturate di organizzazione (tipologia, sport, città/paese, contatti).
- Le opportunità del club non sono mostrate in evidenza come "Jobs".

**Interventi proposti (Step 1)**
- Inserire sezioni About e Dati club (tipologia, sport praticati, sede, contatti, link social).
- Aggiungere un widget "Opportunità aperte" con elenco delle offerte (titolo, luogo, data) e CTA verso dettaglio.
- Mantenere feed dei post sotto alle info principali, con layout a due colonne (info + feed) come LinkedIn.

## 3. Feed Home
**Stato attuale**
- Feed centrale funziona, ma la UI reazioni/commenti è minimale e i media non hanno preview ricca; la colonna destra è stata resa dinamica ma necessita tuning.

**Gap**
- Mancano reazioni multiple stile LinkedIn, contatori visibili e sezione commenti espandibile.
- Non esiste la logica di sharing/repost.

**Interventi proposti (Step 2)**
- Migliorare componente Post con: barre azioni chiare, contatori reazioni/commenti, anteprime media con lightbox, pulsante Condividi (anche solo copia link iniziale).
- Prioritizzare i contenuti di chi seguo e miei post; aggiungere suggerimenti contestuali in feed.

## 4. Network / Follow
**Stato attuale**
- Esistono API per suggerimenti e lista seguiti; UX dei pulsanti Segui/Seguo è minimale; non ci sono pagine "My network" aggregate.

**Gap**
- Mancano viste dedicate a seguaci/seguiti; nessuna gestione inviti/connessioni multiple.

**Interventi proposti (Step 3)**
- Creare pagina "Network" con tab: Suggeriti, Segui, Seguaci, filtrabili per Club/Player.
- Rendere i pulsanti Segui coerenti su feed, profili e risultati ricerca, con stato immediato.

## 5. Opportunità (Jobs)
**Stato attuale**
- Esistono tabelle e box "In evidenza"; manca una vera lista/search opportunità e la scheda dettagliata stile job posting.

**Gap**
- Non esiste percorso dedicato per cercare/salvare/candidarsi; mancano CTA dal profilo club.

**Interventi proposti (Step 4)**
- Costruire pagina lista `/opportunities` con filtri (ruolo, sport, località), stato salvato/candidatura.
- Scheda dettaglio con club info, requisiti, data, pulsanti Candidati/Salva e messaging rapido.
- Widget "Opportunità aperte" nei profili club e richiamo nella colonna destra del feed.

## 6. Messaggi / Chat
**Stato attuale**
- Non è presente un centro messaggi stile LinkedIn nel codice corrente.

**Gap**
- Assenti tabelle/route conversazioni e UI split-pane.

**Interventi proposti (Step 5)**
- Definire schema conversations/messages (se mancante) con indicatore non letti.
- Implementare pagina Messaging a due colonne con lista thread e pannello chat, entrypoint da navbar.

## 7. Notifiche
**Stato attuale**
- Supporto notifiche non visibile nel frontend; icone/contatori non presenti.

**Gap**
- Mancano tipi di notifica per follow, candidature, interazioni post, nuove opportunità.

**Interventi proposti (Step 5)**
- Consolidare tabella notifications e API; creare dropdown e pagina elenco con badge non letti.
- Emettere notifiche su follow, nuovo post da seguiti, candidatura/opportunità, reazioni/commenti.

## 8. Ricerca / Navigazione
**Stato attuale**
- `/search-map` gestisce ricerca geolocalizzata con badge; manca un risultato a lista stile LinkedIn Search e filtri avanzati.

**Interventi proposti (Step 1-2)**
- Mantenere mappa ma aggiungere tabella/lista ordinabile; filtri per ruolo/sport/città.
- Assicurare routing coerente a profili e opportunità.

## 9. Piano di marcia sintetico
1. **Profili** (Player/Club): header completo, sezioni About/Esperienze/Opportunità, fix routing ricerca → profili.
2. **Feed**: UX post, reazioni, commenti, sharing; stabilizzare colonna destra.
3. **Network**: pagina dedicata e coerenza pulsanti Segui.
4. **Opportunità**: lista/filtri, dettaglio, widget nei profili.
5. **Messaging & Notifiche**: schema, API, UI base con badge.

Ogni step può essere sviluppato in PR dedicate per evitare regressioni e mantenere la coerenza con il modello LinkedIn.

## Checklist dei job (stato)

### Job 1 — Profili (Player & Club) + routing ricerca → profili
- [x] 1.1 Player: header completo stile profilo LinkedIn
- [x] 1.2 Player: sezioni Esperienze / Statistiche / Media / Open to opportunities
- [x] 1.3 Club: header e sezioni About / Dati club
- [x] 1.4 Club: widget "Opportunità aperte"
- [x] 1.5 Routing da /search-map → profili
- [ ] 1.6 QA finale Job 1

### Job 2 — Feed home + UX post + colonna destra
- [x] 2.1 Post: barra azioni stile LinkedIn
- [x] 2.2 Commenti: sezione espandibile
- [x] 2.3 Condivisione (share)
- [x] 2.4 Media e lightbox
- [x] 2.5 Colonna destra: “Chi seguire” / “Club/Player che segui” / “In evidenza”
 - [x] 2.6 Ordinamento feed

### Job 3 — Network (pagina dedicata)
- [x] 3.1 Route /network
- [x] 3.2 Tab suggeriti / segui / seguaci
- [x] 3.3 Pulsanti Segui/Seguo coerenti

### Job 4 — Opportunità (lista, dettaglio, widget nei profili)
- [x] 4.1 Pagina lista `/opportunities`
- [x] 4.2 Scheda dettaglio opportunità
- [x] 4.3 Collegamento con profili Club
- [x] 4.4 Collegamento con colonna destra “In evidenza”

### Job 5 — Messaggi & notifiche (schema base)
- [x] 5.1 Schema conversations/messages
- [x] 5.2 UI base Messaging
- [ ] 5.3 Notifiche
- [ ] 5.4 Trigger eventi principali
