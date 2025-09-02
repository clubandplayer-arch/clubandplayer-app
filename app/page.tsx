// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Reindirizza sempre alla pagina principale del tuo dashboard
  redirect('/opportunities'); // cambia in '/club/profile' se preferisci
}
