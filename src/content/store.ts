import { SCHEMA_VERSION, type PinSession } from '../shared/schema';
import type { StoreState } from './session';

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface PinStore {
  load(): Promise<StoreState>;
  save(state: StoreState): Promise<void>;
}

const EMPTY: StoreState = { current: null, previous: null };

export function createStore(area: StorageAreaLike, key: string): PinStore {
  return {
    async load() {
      const raw = (await area.get(key))[key];
      return isStoreState(raw) ? raw : { ...EMPTY };
    },
    async save(state) {
      await area.set({ [key]: state });
    },
  };
}

function isSession(v: unknown): v is PinSession {
  return !!v && typeof v === 'object' && (v as PinSession).version === SCHEMA_VERSION && Array.isArray((v as PinSession).pins);
}

function isStoreState(v: unknown): v is StoreState {
  if (!v || typeof v !== 'object') return false;
  const s = v as StoreState;
  return (s.current === null || isSession(s.current)) && (s.previous === null || isSession(s.previous));
}
