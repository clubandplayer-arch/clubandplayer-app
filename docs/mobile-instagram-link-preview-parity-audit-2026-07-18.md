# Audit parity mobile: anteprima Instagram Reel nel feed

Data: 18 luglio 2026  
Repository sorgente: `clubandplayer-app` web  
Obiettivo per Codex mobile: replicare 1:1 il comportamento web per le anteprime link Instagram condivise nel feed, in particolare i Reel condivisi da browser che prima mostravano solo testo/link o un'immagine rotta.

## Contesto del bug

Nel web il problema si presentava così:

- Un Reel Instagram condiviso da smartphone generava una card corretta con immagine, dominio, titolo e descrizione.
- Un Reel Instagram condiviso da browser generava una card incompleta: immagine assente/rotta e testo HTML non decodificato (`&quot;`, `&#x...;`), con rischio di layout deformato.

La causa non era il contenuto del post, ma la combinazione tra parser metadata e UI preview:

1. Il parser web precedente cercava i `<meta>` con una regex rigida che presupponeva `property="..."` prima di `content="..."`.
2. Instagram non restituisce sempre i metatag nello stesso ordine, soprattutto sui link copiati da browser con query `utm_source=ig_web_copy_link` e `igsh=...`.
3. I valori restituiti da Instagram possono contenere entità HTML; senza decoding, titolo/descrizione rimangono sporchi.
4. Se `og:image` non viene risolta o l'immagine fallisce il caricamento, la UI non deve mostrare un placeholder rotto né lasciare che il testo lungo allarghi la card.

## Fix web da replicare

Codex mobile ha accesso in sola lettura alla repo web. I file web da consultare sono:

- `app/api/link-preview/route.ts`
- `components/feed/FeedComposer.tsx`

Il comportamento corretto è composto da due parti: backend/metadata e UI card.

## Parte 1 — Metadata extraction robusta

Nel web, l'endpoint `/api/link-preview` è stato corretto in `app/api/link-preview/route.ts`.

### Regole da replicare nel mobile

Se la repo mobile ha un proprio fetcher/parser link-preview, deve replicare queste regole:

1. Accettare solo URL `http:` o `https:` e normalizzarle con il costruttore URL della piattaforma.
2. Scaricare HTML con redirect abilitati, timeout e header da browser/bot link-preview.
3. Leggere abbastanza HTML iniziale per intercettare i metadati; nel web il limite è stato portato a `400 * 1024` byte.
4. Estrarre i tag `<meta>` senza dipendere dall'ordine degli attributi.
5. Supportare almeno:
   - `property="og:title"`
   - `name="twitter:title"`
   - `property="og:description"`
   - `name="description"`
   - `name="twitter:description"`
   - `property="og:image"`
   - `name="twitter:image"`
6. Decodificare le entità HTML nei valori estratti prima di salvarli/renderizzarli.
7. Risolvere `og:image`/`twitter:image` rispetto alla URL sorgente, così anche immagini relative diventano assolute.
8. Restituire una risposta semanticamente equivalente a:

```ts
{
  ok: true,
  url,
  title: title || null,
  description: description || null,
  image: image || null,
}
```

### Pseudocodice parser mobile

Adattare al linguaggio/framework mobile, ma mantenere la logica:

```ts
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .trim();
}

function extractMeta(html: string, expectedName: string, attr: 'property' | 'name') {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const tagName = readAttribute(tag, attr)?.toLowerCase();
    if (tagName !== expectedName.toLowerCase()) continue;
    const content = readAttribute(tag, 'content');
    if (content) return decodeHtmlEntities(content);
  }
  return null;
}
```

Punto fondamentale: `readAttribute(tag, 'content')` deve cercare `content="..."` o `content='...'` ovunque nel tag, non solo dopo `property`/`name`.

## Parte 2 — UI della card preview

Nel web, la card è stata corretta in `components/feed/FeedComposer.tsx`, funzione `LinkPreviewCard`.

### Regole UI da replicare nel mobile

La card mobile deve comportarsi come il web:

1. Mostrare sempre una card cliccabile/apribile quando esiste una preview link.
2. Usare `preview.url || url` come destinazione.
3. Mostrare il dominio normalizzato, ad esempio `INSTAGRAM.COM`/`instagram.com` a seconda dello stile mobile esistente.
4. Mostrare immagine solo se `preview.image` esiste e carica davvero.
5. Se l'immagine fallisce il caricamento:
   - nasconderla;
   - non mostrare icona rotta;
   - non deformare la card.
6. Limitare titolo e descrizione a massimo 2 righe.
7. Consentire wrapping/troncamento delle stringhe lunghe, evitando overflow orizzontale.
8. Usare dimensioni immagine coerenti con web: immagine quadrata o rettangolare fissa, `object-cover`/equivalente.

### Pseudocodice UI mobile

Esempio React Native concettuale:

```tsx
const [imageFailed, setImageFailed] = useState(false);
const href = preview?.url || url;
const showImage = Boolean(preview?.image && !imageFailed);

useEffect(() => {
  setImageFailed(false);
}, [preview?.image]);

return (
  <Pressable onPress={() => openUrl(href)} style={styles.card}>
    <View style={styles.row}>
      {showImage ? (
        <Image
          source={{ uri: preview.image }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <View style={styles.textColumn}>
        <Text numberOfLines={1} style={styles.domain}>{domainFromUrl(href)}</Text>
        <Text numberOfLines={2} style={styles.title}>{preview?.title || 'Link'}</Text>
        {preview?.description ? (
          <Text numberOfLines={2} style={styles.description}>{preview.description}</Text>
        ) : null}
      </View>
    </View>
  </Pressable>
);
```

Stili minimi equivalenti:

```ts
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
});
```

## Strategia consigliata per la repo mobile

### Caso A — Il mobile consuma già i metadata salvati dal web/backend

Se il feed mobile riceve già `link_preview`, `preview`, `metadata`, `og_image` o campi simili dal backend:

1. Non rifare fetch diretto di Instagram dal device se non necessario.
2. Verificare che il mobile legga gli stessi campi usati dal web:
   - `url`
   - `title`
   - `description`
   - `image`
3. Se oggi il mobile mostra solo il link, il problema è probabilmente nel mapping dati o nella UI che ignora `image`.
4. Adeguare la card mobile alle regole UI sopra.

### Caso B — Il mobile genera autonomamente la preview

Se il mobile chiama un proprio endpoint o esegue fetch/parsing autonomo:

1. Portare la logica del parser web nel servizio mobile.
2. Evitare regex che richiedono un ordine specifico degli attributi nel tag `<meta>`.
3. Aggiungere decoding entità HTML.
4. Risolvere immagini relative con base URL.
5. Gestire errori di fetch senza rompere il rendering del post: in caso di fallimento, mostrare almeno link e dominio.

### Caso C — Esiste un endpoint web condivisibile

Soluzione preferita per parity 1:1:

1. Far chiamare al mobile lo stesso endpoint `/api/link-preview` usato dal web, se accessibile e autenticazione/CORS lo consentono.
2. Salvare/renderizzare la risposta con gli stessi nomi campo (`url`, `title`, `description`, `image`).
3. Mantenere una sola implementazione del parser lato server per ridurre divergenze future web/mobile.

## Checklist di verifica mobile

Codex mobile deve testare almeno questi casi:

- Reel Instagram copiato da browser con query `utm_source=ig_web_copy_link` e `igsh=...`.
- Reel Instagram copiato da app smartphone con query più corta, ad esempio `?igsh=...`.
- Link Instagram con titolo/descrizione contenenti virgolette, emoji o entità HTML.
- Link con `og:image` valido.
- Link con `og:image` assente.
- Link con immagine presente ma caricamento fallito lato app.
- Test visuale su feed mobile stretto: nessun overflow orizzontale e nessuna icona immagine rotta.

## Expected result mobile

Per i Reel Instagram, il post mobile deve mostrare:

1. Il testo del post con URL originale sopra o vicino alla card, se questo è il comportamento già previsto.
2. Una card anteprima con:
   - thumbnail del Reel;
   - dominio Instagram;
   - titolo decodificato correttamente;
   - descrizione decodificata/troncata;
   - tap sulla card che apre il link originale/normalizzato.
3. Layout stabile anche quando Instagram non restituisce immagine o il device non riesce a caricarla.

## Nota importante

Il web ora funziona perché sono state corrette entrambe le superfici del bug: parsing metadata e rendering della card. Per ottenere parity 1:1, il mobile non deve limitarsi ad aggiungere un `<Image>`: deve anche garantire che i dati `image`, `title` e `description` arrivino puliti e con la stessa semantica del web.
