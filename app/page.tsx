// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Atterraggio stile LinkedIn: non loggati -> /signup (la pagina reindirizza a /feed se già loggati)
  redirect('/signup');
}
