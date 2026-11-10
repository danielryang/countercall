import type { ReactNode } from 'react';
import { AppShell } from './_parts/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
