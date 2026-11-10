'use client';
// lib/use-events.ts: the ONE transport hook (PLAN s13 M8). Snapshot, then adaptive polling of GET /api/events, into the pure reducer.
// The UI never sees how events arrive: live polling and recorded-run replay both produce the same State. Swapping the transport touches only this file.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { beatDelay } from './beats';
import { nextDelay, shouldPause } from './poll';
import { apply, initial, type Ev, type State } from './reducer';
import type { Run } from './runs';
import { callingCase } from './selectors';

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'paused' | 'replay';
export interface ReplayControls { name: string; position: number; total: number; playing: boolean; speed: number; description: string; source: Run['source']; play(): void; pause(): void; step(): void; restart(): void; setSpeed(x: number): void }
export interface Stream { state: State; status: StreamStatus; resume(): void; replay: ReplayControls | null }

const PAGE = 1000;

export function useEventStream(opts: { replay?: string | null; at?: number | null } = {}): Stream {
  const replayName = opts.replay ?? null;
  const at = opts.at ?? null;                       // freeze a replay at event N (exact frames for screenshots and review)
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<StreamStatus>(replayName ? 'replay' : 'connecting');
  const stateRef = useRef(state); stateRef.current = state;
  const interaction = useRef(Date.now());
  const resumeRef = useRef<() => void>(() => {});
  const feed = useCallback((events: Ev[]) => setState((s) => events.reduce(apply, s)), []);

  // ---- live polling
  useEffect(() => {
    if (replayName) return;
    let stop = false; let timer: ReturnType<typeof setTimeout> | undefined; let errors = 0; let lastEventAt = 0; let paused = false;
    let fetched = 0; let first = true;                    // cursor of what was FETCHED (the screen may lag it by a few beats)
    const queue: Ev[] = []; let showing = false;
    const drain = () => {                                  // draw queued events one story beat at a time
      if (showing) return; showing = true;
      const next = () => { const e = queue.shift(); if (!e || stop) { showing = false; return; } feed([e]); const w = beatDelay(e, queue.length); if (w) setTimeout(next, w); else next(); };
      next();
    };
    const tick = async () => {
      if (stop || paused) return;
      let more = false;
      try {
        const res = await fetch(`/api/events?after=${fetched}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`events ${res.status}`);
        const body = (await res.json()) as { events: Ev[] };
        if (stop) return;
        if (body.events.length) {
          fetched = body.events[body.events.length - 1].seq; lastEventAt = Date.now();
          if (first) { feed(body.events); } else { queue.push(...body.events); drain(); }   // the first load is history: show it at once
          if (body.events.length < PAGE) first = false;
        } else first = false;
        more = body.events.length === PAGE;                           // a full page means there is more: catch up without waiting
        errors = 0; setStatus('live');
      } catch { errors += 1; setStatus('reconnecting'); }
      if (stop) return;
      if (shouldPause(Date.now(), interaction.current)) { paused = true; setStatus('paused'); return; }
      timer = setTimeout(tick, more ? 0 : nextDelay({ calling: !!callingCase(stateRef.current), now: Date.now(), lastEventAt, hidden: typeof document !== 'undefined' && document.hidden, consecutiveErrors: errors }));
    };
    resumeRef.current = () => { interaction.current = Date.now(); if (paused) { paused = false; setStatus('connecting'); void tick(); } };
    const touch = () => resumeRef.current();
    window.addEventListener('pointerdown', touch); window.addEventListener('keydown', touch);
    void tick();
    return () => { stop = true; if (timer) clearTimeout(timer); window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); };
  }, [replayName, feed]);

  // ---- recorded-run replay (no API, no DB, no keys): the keyless judge path and the live-final fallback
  const [run, setRun] = useState<Run | null>(null);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeedState] = useState(1);
  useEffect(() => {
    if (!replayName) return;
    let stop = false;
    setState(initial); setPosition(0); setPlaying(true); setStatus('replay');
    fetch(`/runs/${encodeURIComponent(replayName)}.json`).then((r) => r.json() as Promise<Run>).then((r) => {
      if (stop) return;
      setRun(r);
      if (at !== null) { setState(r.events.slice(0, at).reduce(apply, initial)); setPosition(Math.min(at, r.events.length)); setPlaying(false); }
    }).catch(() => { if (!stop) setStatus('reconnecting'); });
    return () => { stop = true; };
  }, [replayName, at]);
  useEffect(() => {
    if (!run || !playing || position >= run.events.length) return;
    const next = run.events[position];
    const t = setTimeout(() => { feed([next]); setPosition((p) => p + 1); }, Math.min(next.delay_ms, 9000) / speed);
    return () => clearTimeout(t);
  }, [run, playing, position, speed, feed]);

  const replay = useMemo<ReplayControls | null>(() => !replayName || !run ? null : {
    name: replayName, position, total: run.events.length, playing, speed, description: run.description, source: run.source,
    play: () => setPlaying(true), pause: () => setPlaying(false),
    step: () => { setPlaying(false); if (position < run.events.length) { feed([run.events[position]]); setPosition(position + 1); } },
    restart: () => { setState(initial); setPosition(0); setPlaying(true); },
    setSpeed: (x) => setSpeedState(x),
  }, [replayName, run, position, playing, speed, feed]);

  return { state, status, resume: () => resumeRef.current(), replay };
}
