import { SCHEMA_VERSION, sessionId, type Pin, type PinSession } from '../shared/schema';

export interface StoreState {
  current: PinSession | null;
  previous: PinSession | null;
}

export type NewPin = Omit<Pin, 'n'>;

export function newSession(url: string, title: string, now: Date): PinSession {
  return { version: SCHEMA_VERSION, id: sessionId(now), page: { url, title }, pins: [], nextN: 1 };
}

/** Same origin + pathname; query and hash changes do not start a new session. */
export function samePage(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin && ua.pathname === ub.pathname;
  } catch {
    return a === b;
  }
}

export function sessionFor(state: StoreState, url: string, title: string, now: Date): StoreState {
  if (state.current && samePage(state.current.page.url, url)) return state;
  const previous = state.current && state.current.pins.length > 0 ? state.current : state.previous;
  return { current: newSession(url, title, now), previous };
}

export function addPin(s: PinSession, data: NewPin): { session: PinSession; pin: Pin } {
  const pin: Pin = { ...data, n: s.nextN };
  return { session: { ...s, pins: [...s.pins, pin], nextN: s.nextN + 1 }, pin };
}

export function updateComment(s: PinSession, n: number, comment: string): PinSession {
  return { ...s, pins: s.pins.map(p => (p.n === n ? { ...p, comment } : p)) };
}

export function removePin(s: PinSession, n: number): PinSession {
  return { ...s, pins: s.pins.filter(p => p.n !== n) };
}

/** Removes a just-created pin; gives its number back if it was the newest. */
export function discardNewPin(s: PinSession, n: number): PinSession {
  const removed = removePin(s, n);
  return n === s.nextN - 1 ? { ...removed, nextN: n } : removed;
}

export function setStatuses(s: PinSession, statuses: ReadonlyMap<number, Pin['status']>): PinSession {
  let changed = false;
  const pins = s.pins.map(p => {
    const status = statuses.get(p.n);
    if (!status || status === p.status) return p;
    changed = true;
    return { ...p, status };
  });
  return changed ? { ...s, pins } : s;
}

export function clearPins(s: PinSession, now: Date): PinSession {
  return newSession(s.page.url, s.page.title, now);
}

export function swapPrevious(state: StoreState): StoreState {
  if (!state.previous) return state;
  const keep = state.current && state.current.pins.length > 0 ? state.current : null;
  return { current: state.previous, previous: keep };
}
