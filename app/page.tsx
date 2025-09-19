// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Home = bacheca sempre
  redirect('/feed');
}
