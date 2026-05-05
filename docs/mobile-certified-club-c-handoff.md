# Handoff Codex Mobile — Replica badge “C” Club certificato

## Obiettivo
La **“C” di Club certificato** va mostrata ovunque compaia il logo/avatar di un club verificato, per dare fiducia immediata a Player e utenti.

In web, la regola è:

- mostra la `C` **solo** se il profilo è un club (`account_type/kind === 'club'`)
- e se risulta verificato (`is_verified === true`)

## 1) Logica da replicare in mobile (regola unica)
Implementa una utility condivisa (esempio):

```ts
export function isCertifiedClub(profile: {
  accountType?: string | null
  kind?: string | null
  isVerified?: boolean | null
  is_verified?: boolean | null
}) {
  const isClub = (profile.accountType ?? profile.kind) === 'club'
  const verified = Boolean(profile.isVerified ?? profile.is_verified)
  return isClub && verified
}
```

> Importante: in alcuni payload il campo arriva come `is_verified`, in altri come `isVerified`.

## 2) Componente badge unico in mobile
In web esistono varianti con piccoli offset diversi in base al contesto (`sidebar`, `profile`, `following`). In mobile evita duplicazioni e crea **un solo componente base** con props:

- `size` (es. `sm | md | lg`)
- `offsetX/offsetY` opzionali per allineamento fine
- `color` default brand

Caratteristiche visive da mantenere:

- testo `C`
- `fontWeight: 700`
- colore brand
- posizionamento **sopra l’avatar** con wrapper `position: 'relative'` + badge `position: 'absolute'`
- accessibilità: label tipo `Club certificato`

## 3) Dove è stata applicata in web (mappa per replicare in repo mobile)
Replica la `C` in tutti i punti mobile equivalenti ai seguenti scenari:

1. **Card post/feed** (avatar autore)
2. **Commenti** (avatar autore commento)
3. **Who to follow / suggeriti**
4. **Club seguiti / Following list**
5. **Header profilo club**
6. **Discover risultati**
7. **Navbar/avatar utente club verificato** (se in mobile è previsto)

## 4) Pattern UI consigliato (React Native)

```tsx
<View style={{ position: 'relative' }}>
  <Avatar uri={club.avatar_url} size={40} />
  {isCertifiedClub(club) ? (
    <View
      accessible
      accessibilityLabel="Club certificato"
      style={{
        position: 'absolute',
        top: -2,
        right: -2,
      }}
    >
      <Text style={{ color: BRAND_COLOR, fontWeight: '700', fontSize: 12 }}>C</Text>
    </View>
  ) : null}
</View>
```

## 5) Checklist implementativa per Codex Mobile
1. Crea utility comune `isCertifiedClub(...)`.
2. Crea componente comune `CertifiedClubCMark`.
3. Integra il componente in **tutte** le celle/avatar club nelle schermate feed, following, discover, profile, suggeriti, commenti.
4. Uniforma mappatura dati API (`is_verified` ↔ `isVerified`).
5. Aggiungi test snapshot/UI per:
   - club verificato (badge visibile)
   - club non verificato (badge assente)
   - player verificato/non verificato (badge assente)
6. Verifica visuale su avatar piccoli e grandi (24/32/40/64 px).

## 6) Note di coerenza prodotto
- La “C” **non** è un elemento decorativo: è un segnale di **autenticità del club**.
- Deve essere sempre consistente, senza eccezioni nei punti dove l’utente vede il logo del club.
- Se una vista usa un componente avatar condiviso, inserire lì la logica è la scelta migliore per evitare dimenticanze.

## 7) Regola finale anti-errori
Se c’è un avatar/logo club e i dati `is_verified/isVerified` sono disponibili, la `C` deve essere gestita automaticamente dal componente shared avatar (non manualmente view per view).
