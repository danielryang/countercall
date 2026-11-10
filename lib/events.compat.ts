// lib/events.compat.ts: compile-time proof that 01's CallEvent and 02's AppEvent are members of the canonical EmittedEvent.
// If a research type drifts, or a producer adds an event the contract lacks, `npm run typecheck` fails right here.
import type { AppEvent } from './detect/ingest';
import type { CallEvent } from './voice/events';
import type { EmittedEvent } from './events';

type Assert<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;
export type DetectEventsAreCanonical = Assert<Extends<AppEvent, EmittedEvent>>;
export type VoiceEventsAreCanonical = Assert<Extends<CallEvent, EmittedEvent>>;
