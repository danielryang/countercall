// /demo: the presenter's control panel. Hidden (404) unless DEMO_ENABLED=1; every action behind it needs the passcode session.
import { notFound } from 'next/navigation';
import { env } from '@/lib/env';
import { DemoPanel } from './DemoPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo controls' };

export default function DemoPage() {
  if (!env().DEMO_ENABLED) notFound();
  return <DemoPanel />;
}
