import AppShell from '@/components/shell/AppShell';

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
