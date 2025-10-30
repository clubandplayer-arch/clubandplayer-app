# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - heading "Pagina non trovata" [level=1] [ref=e3]
    - paragraph [ref=e4]: La risorsa richiesta non esiste o è stata spostata.
    - generic [ref=e5]:
      - link "Torna alla home" [ref=e6] [cursor=pointer]:
        - /url: /
      - link "Vai alle opportunità" [ref=e7] [cursor=pointer]:
        - /url: /opportunities
  - alert [ref=e8]
  - generic [ref=e10]:
    - paragraph [ref=e11]:
      - text: Usiamo cookie tecnici e di misurazione anonima per migliorare il servizio. Proseguendo accetti la nostra
      - link "Privacy Policy" [ref=e12] [cursor=pointer]:
        - /url: /legal/privacy
      - text: e i
      - link "Termini" [ref=e13] [cursor=pointer]:
        - /url: /legal/terms
      - text: .
    - generic [ref=e14]:
      - button "Accetta" [ref=e15]
      - button "Solo necessari" [ref=e16]
```