# Audit SEO ed European Accessibility Act — 2026-05-29

## Premessa operativa

Club and Player è un'applicazione prevalentemente autenticata: la maggior parte delle rotte applicative richiede login o viene reindirizzata in base al ruolo. Di conseguenza la strategia SEO non deve provare a indicizzare dashboard, feed, profili privati, candidature, messaggi o aree amministrative.

Le sole pagine considerate pubblicamente visitabili in questa fase sono:

- `/signup`
- `/login`
- `/legal/privacy`
- `/legal/terms`
- `/legal/beta`
- `/legal/child-safety`

## Decisioni SEO applicate nel repo web

1. **Sitemap limitata alle pagine indicizzabili**  
   La sitemap espone solo `/signup` e le pagine legal. Sono stati rimossi percorsi autenticati o applicativi come `/feed`, `/opportunities`, `/profile` e `/my/applications`, perché non sono landing pubbliche coerenti per i crawler.

2. **Robots.txt coerente con il perimetro pubblico**  
   Il robots consente la scansione solo delle pagine visitabili pubblicamente e blocca il resto del sito. `/login` resta visitabile dai crawler ma non viene incluso in sitemap.

3. **Pagina di registrazione come landing principale**  
   `/signup` è la pagina pubblica con maggiore valore SEO: descrive il prodotto, i ruoli supportati e i link alle app store. Sono stati aggiunti title, description, canonical, Open Graph e Twitter metadata.

4. **Login non indicizzabile**  
   `/login` serve all'accesso, non al posizionamento organico. È stato aggiunto `robots: noindex, follow` mantenendo canonical e metadati descrittivi minimi.

5. **Pagine legal indicizzabili con metadati dedicati**  
   Le pagine privacy, termini, beta e child safety hanno title, description e canonical. Hanno valore soprattutto per fiducia, compliance, app store review e query navigazionali/branded.

6. **Dominio canonico centralizzato**  
   La generazione di URL assoluti usa un helper unico con priorità a variabili d'ambiente (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_URL`) e fallback al dominio pubblico.

## Raccomandazioni SEO successive

- Creare una vera landing pubblica su `/` oppure rendere `/signup` esplicitamente la home canonica anche a livello di comunicazione esterna. Un redirect permanente da `/` a `/signup` è accettabile, ma una home pubblica 200 sarebbe più flessibile per campagne e brand query.
- Aggiungere contenuto testuale più specifico in `/signup`: sport supportati, valore per club, valore per player/staff, sicurezza, privacy e disponibilità mobile.
- Valutare pagine pubbliche non autenticabili e non sensibili in futuro, ad esempio `/about`, `/support`, `/club`, `/player`, `/staff`, `/fan`, se il go-to-market richiede traffico organico non branded.
- Evitare l'indicizzazione di profili o contenuti generati dagli utenti finché non esiste un modello chiaro di consenso, moderazione, privacy e qualità contenuto.
- Configurare Google Search Console e Bing Webmaster Tools sul dominio canonico e inviare `/sitemap.xml`.
- Verificare che i redirect tra `clubandplayer.com`, `www.clubandplayer.com` ed eventuale dominio `.app` siano univoci, preferibilmente 301 verso un solo dominio canonico.

## European Accessibility Act — stato attuale

L'European Accessibility Act (EAA) si applica dal 28 giugno 2025 a molti servizi digitali rivolti ai consumatori nell'UE. Per il repo web l'obiettivo pratico dovrebbe essere allinearsi a WCAG 2.1/2.2 livello AA e mantenere evidenze di test.

### Aspetti già positivi nel repo web

- Presenza di skip link globale verso il contenuto principale.
- Lingua documento impostata su `it`.
- Diverse form hanno label esplicite e attributi `autocomplete`.
- Le pagine legal hanno struttura semantica con heading e sezioni.
- Esiste attenzione a consenso cookie, privacy analytics e contenuti child safety.

### Gap o rischi da verificare nel repo web

- Mancano test automatizzati di accessibilità (ad esempio axe/playwright) nella pipeline.
- Alcuni componenti applicativi complessi (modali, menu, feed, messaggi, uploader, mappe) richiedono audit tastiera/screen reader dedicato.
- Va verificato il contrasto colore reale su gradienti, badge, placeholder, pulsanti disabilitati e testi secondari.
- Serve una policy di focus management per modali, lightbox, overlay mobile, menu utente e notifiche.
- Le pagine client-side devono preservare heading hierarchy, landmark e messaggi di errore annunciabili.
- Media caricati dagli utenti richiedono regole per testi alternativi, trascrizioni/sottotitoli quando applicabile e moderazione.
- Le mappe e i picker geografici devono avere alternative testuali o flussi equivalenti.

### Repo mobile — cosa andrà fatto in seguito

Non avendo analizzato il repository mobile in questa attività, lo stato EAA mobile resta **non determinabile**. Nel secondo passaggio andranno verificati almeno:

- supporto VoiceOver e TalkBack per tutte le schermate critiche;
- etichette accessibili su pulsanti, tab, icone, campi e controlli custom;
- ordine di navigazione e focus coerente;
- dimensioni touch target e spacing;
- Dynamic Type / font scaling senza rotture layout;
- contrasto colori in tema chiaro/scuro;
- alternative per immagini, video e contenuti user-generated;
- gestione accessibile di errori form, toast, modali, bottom sheet e notifiche;
- test manuali su iOS e Android più eventuale suite automatizzata dove supportata.

## Conclusione

Per il web, la base SEO è stata corretta rispetto al fatto che il prodotto è quasi interamente protetto da login: sitemap e robots ora non promuovono aree private e la landing pubblica `/signup` è il principale punto indicizzabile. Lato EAA il repo mostra alcune buone basi, ma non si può dichiarare piena conformità senza audit WCAG completo, test assistive technology e remediation sui componenti interattivi principali. Il repo mobile richiede un audit separato.
