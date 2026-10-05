import { describe, expect, it } from 'vitest';
import { createStore, type StorageAreaLike } from './store';
import { addPin, newSession } from './session';
import { makeNewPin } from '../test/fixtures';

function memoryArea(): StorageAreaLike & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  return {
    data,
    get: async k => (k in data ? { [k]: structuredClone(data[k]) } : {}),
    set: async items => { Object.assign(data, structuredClone(items)); },
  };
}

describe('createStore', () => {
  it('loads empty state when nothing is stored', async () => {
    await expect(createStore(memoryArea(), 'pins:1').load()).resolves.toEqual({ current: null, previous: null });
  });

  it('round-trips state under its key', async () => {
    const area = memoryArea();
    const store = createStore(area, 'pins:7');
    const state = { current: addPin(newSession('https://a.test/', 'A', new Date(0)), makeNewPin()).session, previous: null };
    await store.save(state);
    expect(Object.keys(area.data)).toEqual(['pins:7']);
    await expect(store.load()).resolves.toEqual(state);
  });

  it('discards state from another schema version', async () => {
    const area = memoryArea();
    area.data['pins:1'] = { current: { version: 99, pins: [] }, previous: null };
    await expect(createStore(area, 'pins:1').load()).resolves.toEqual({ current: null, previous: null });
  });
});
