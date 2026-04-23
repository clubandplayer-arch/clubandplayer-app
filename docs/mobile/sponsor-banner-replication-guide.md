# Sponsor CTA banner (feed) — guida di replica pixel-perfect per Codex Mobile

Questa guida documenta **esattamente** il box CTA mostrato nel feed web (`/feed`) con testo:

- "Sei un’attività e vuoi farti conoscere da club e player?"
- "Sponsorizza su Club & Player: richiedi informazioni in 30 secondi."
- Bottone: "Richiedi info"

Fonte implementativa web: `app/(dashboard)/feed/page.tsx`.

---

## 1) Specifiche visuali canoniche (da cui partire)

Container principale:

- Background: `#036F9A`
- Border radius: `12`
- Padding orizzontale: `16`
- Padding verticale: `12`
- Layout: row, `justify-between`, `align-start`
- Gap contenuti: `12`
- Margin bottom: `12`
- Larghezza: `100%`

Colonna testo:

- `minWidth: 0` (importante per evitare overflow su device stretti)
- Titolo:
  - Font size: `14`
  - Font weight: `600`
  - Colore: `#FFFFFF`
  - Testo: `Sei un’attività e vuoi farti conoscere da club e player?`
- Sottotitolo:
  - Margin top: `2`
  - Font size: `12`
  - Line height: `20`
  - Colore: `rgba(255,255,255,0.90)`
  - Testo: `Sponsorizza su Club & Player: richiedi informazioni in 30 secondi.`

Bottone CTA:

- Label: `Richiedi info`
- Background: `#FFFFFF`
- Border radius: `8`
- Padding orizzontale: `12`
- Padding verticale: `8`
- Testo:
  - Font size: `14`
  - Font weight: `600`
  - Colore: `#036F9A`
- Comportamento layout:
  - `flexShrink: 0` (non deve restringersi)
  - allineato in alto rispetto al blocco testo

Interazione:

- Tap su CTA → naviga a `/sponsor`

---

## 2) Mapping 1:1 dal codice web attuale

Nel file `app/(dashboard)/feed/page.tsx` il componente è:

- wrapper: `rounded-xl bg-[#036f9a] px-4 py-3 ... flex items-start justify-between gap-3 mb-3`
- titolo: `text-sm font-semibold`
- sottotitolo: `mt-0.5 text-xs leading-5 text-white/90`
- bottone: `rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#036f9a] shrink-0`

Questi utility classes sono i valori da replicare in mobile native.

---

## 3) Prompt pronto da dare a Codex Mobile (iOS + Android)

Usa questo prompt (copiabile) per massimizzare la fedeltà:

```text
Implementa un componente React Native chiamato SponsorCtaBanner che replichi pixel-perfect il banner CTA del feed Club & Player.

Vincoli UI:
- Container: background #036F9A, borderRadius 12, paddingHorizontal 16, paddingVertical 12, width 100%, marginBottom 12.
- Layout container: flexDirection row, justifyContent space-between, alignItems flex-start, gap 12.
- Blocco testo: flex 1, minWidth 0.
- Titolo: "Sei un’attività e vuoi farti conoscere da club e player?", fontSize 14, fontWeight 600, color #FFFFFF.
- Sottotitolo: "Sponsorizza su Club & Player: richiedi informazioni in 30 secondi.", marginTop 2, fontSize 12, lineHeight 20, color rgba(255,255,255,0.9).
- Bottone: label "Richiedi info", background #FFFFFF, borderRadius 8, paddingHorizontal 12, paddingVertical 8, alignSelf flex-start, flexShrink 0.
- Testo bottone: fontSize 14, fontWeight 600, color #036F9A.

Comportamento:
- onPress CTA => callback onRequestInfo() (non hardcodare la navigation nel componente).
- Accessibilità: role button, accessibilityLabel "Vai alla pagina sponsor".

Cross-platform:
- Deve rendere identico su iOS e Android.
- Gestire schermi stretti senza overflow del testo (max 2 righe titolo, 2-3 righe sottotitolo).

Output richiesto:
1) Codice completo del componente.
2) Esempio d'uso dentro una FeedScreen.
3) Variante con design tokens (colors, spacing, radius, typography) separati in file theme.
4) Test snapshot/base rendering.
```

---

## 4) Checklist di verifica per “replica perfetta”

- Colore sfondo banner coincide con `#036F9A`.
- Bottone bianco resta leggibile e non collassa su device piccoli.
- Spaziature verticali/orizzontali rispettano 12/16 px.
- Gerarchia tipografica corretta (14/12 px con pesi 600).
- Testo italiano identico (inclusi apostrofi e maiuscole/minuscole).
- Tap target del bottone >= 40 px in altezza percepita.
- Nessun overflow/clipping su Android small width.

---

## 5) Nota pratica

Se vuoi ridurre differenze tra piattaforme, conviene centralizzare i token (`brandPrimary = #036F9A`, `radiusMd = 8`, `radiusLg = 12`, ecc.) e riusarli anche in altri CTA del feed.
