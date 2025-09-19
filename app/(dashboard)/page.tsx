// app/(dashboard)/page.tsx
import { redirect } from 'next/navigation';

export default function RootRedirect() {
  // Root della dashboard: vai SEMPRE in bacheca.
  redirect('/feed');
}
