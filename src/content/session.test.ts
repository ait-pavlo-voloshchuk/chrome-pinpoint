import { describe, expect, it } from 'vitest';
import {
  addPin, clearPins, discardNewPin, newSession, removePin, samePage, sessionFor,
  setStatuses, swapPrevious, updateComment, type StoreState,
} from './session';
import { makeNewPin } from '../test/fixtures';

const T0 = new Date('2026-10-05T10:42:13.123Z');
const T1 = new Date('2026-10-05T11:00:00.000Z');
const URL_A = 'https://app.test/billing';

describe('session', () => {
  it('creates a session with a folder-safe id', () => {
    const s = newSession(URL_A, 'Billing', T0);
    expect(s).toEqual({ version: 1, id: '2026-10-05T10-42-13', page: { url: URL_A, title: 'Billing' }, pins: [], nextN: 1 });
  });

  it('numbers pins monotonically and never reuses a deleted number', () => {
    let s = newSession(URL_A, 'Billing', T0);
    s = addPin(s, makeNewPin()).session;
    s = addPin(s, makeNewPin()).session;
    s = removePin(s, 1);
    const { session, pin } = addPin(s, makeNewPin());
    expect(pin.n).toBe(3);
    expect(session.pins.map(p => p.n)).toEqual([2, 3]);
  });

  it('discardNewPin rolls back nextN only for the newest pin', () => {
    let s = newSession(URL_A, 'Billing', T0);
    s = addPin(s, makeNewPin()).session;
    s = addPin(s, makeNewPin()).session;
    expect(discardNewPin(s, 2).nextN).toBe(2);
    expect(discardNewPin(s, 1).nextN).toBe(3);
  });

  it('updates a comment', () => {
    let s = addPin(newSession(URL_A, 'Billing', T0), makeNewPin()).session;
    s = updateComment(s, 1, 'Bigger');
    expect(s.pins[0].comment).toBe('Bigger');
  });

  it('treats query and hash changes as the same page', () => {
    expect(samePage(URL_A, `${URL_A}?tab=2#x`)).toBe(true);
    expect(samePage(URL_A, 'https://app.test/settings')).toBe(false);
    expect(samePage(URL_A, 'http://app.test/billing')).toBe(false);
  });

  it('sessionFor keeps state on the same page and archives pins on a new page', () => {
    const current = addPin(newSession(URL_A, 'Billing', T0), makeNewPin()).session;
    const state: StoreState = { current, previous: null };
    expect(sessionFor(state, `${URL_A}?q=1`, 'Billing', T1)).toBe(state);

    const moved = sessionFor(state, 'https://app.test/settings', 'Settings', T1);
    expect(moved.previous).toBe(current);
    expect(moved.current?.page.url).toBe('https://app.test/settings');
    expect(moved.current?.pins).toEqual([]);
  });

  it('sessionFor does not archive an empty session', () => {
    const old = addPin(newSession('https://app.test/old', 'Old', T0), makeNewPin()).session;
    const state: StoreState = { current: newSession(URL_A, 'Billing', T0), previous: old };
    expect(sessionFor(state, 'https://app.test/next', 'Next', T1).previous).toBe(old);
  });

  it('sessionFor starts a session from empty state', () => {
    const next = sessionFor({ current: null, previous: null }, URL_A, 'Billing', T0);
    expect(next.current?.id).toBe('2026-10-05T10-42-13');
  });

  it('swapPrevious restores the previous page session', () => {
    const prev = addPin(newSession('https://app.test/old', 'Old', T0), makeNewPin()).session;
    const cur = addPin(newSession(URL_A, 'Billing', T1), makeNewPin()).session;
    expect(swapPrevious({ current: cur, previous: prev })).toEqual({ current: prev, previous: cur });
    expect(swapPrevious({ current: cur, previous: null })).toEqual({ current: cur, previous: null });
  });

  it('clearPins starts a fresh session id on the same page', () => {
    const s = addPin(newSession(URL_A, 'Billing', T0), makeNewPin()).session;
    const cleared = clearPins(s, T1);
    expect(cleared.pins).toEqual([]);
    expect(cleared.nextN).toBe(1);
    expect(cleared.id).toBe('2026-10-05T11-00-00');
    expect(cleared.page).toEqual(s.page);
  });

  it('setStatuses returns the same object when nothing changes', () => {
    const s = addPin(newSession(URL_A, 'Billing', T0), makeNewPin()).session;
    expect(setStatuses(s, new Map([[1, 'attached']]))).toBe(s);
    expect(setStatuses(s, new Map([[1, 'detached']])).pins[0].status).toBe('detached');
  });
});
