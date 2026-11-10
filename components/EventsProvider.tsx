'use client';
// components/EventsProvider.tsx: one event stream per page, shared through context. `replay` selects a recorded run instead of the live API.
import { createContext, useContext, type ReactNode } from 'react';
import { useEventStream, type Stream } from '@/lib/use-events';

const Ctx = createContext<Stream | null>(null);
export function EventsProvider({ replay, children }: { replay?: string | null; children: ReactNode }) {
  const stream = useEventStream({ replay });
  return <Ctx.Provider value={stream}>{children}</Ctx.Provider>;
}
export function useStream(): Stream {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStream must be used inside <EventsProvider>');
  return s;
}
