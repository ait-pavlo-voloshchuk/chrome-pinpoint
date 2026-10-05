import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller } from './controller';
import { createStore, type StorageAreaLike } from './store';
import type { StoreState } from './session';

const KEY = 'pins:1';
let area: StorageAreaLike & { data: Record<string, unknown> };
let controller: Controller;

const shadow = () => document.querySelector('pinpoint-overlay')!.shadowRoot!;
const bubbleInput = () => shadow().querySelector<HTMLTextAreaElement>('.pp-bubble-input');
const saved = () => area.data[KEY] as StoreState;

async function pinSave(): Promise<HTMLTextAreaElement> {
  const btn = document.getElementById('save')!;
  btn.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, composed: true }));
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  await vi.waitFor(() => expect(bubbleInput()).not.toBeNull(), { timeout: 2000 });
  return bubbleInput()!;
}

beforeEach(async () => {
  document.querySelectorAll('pinpoint-overlay').forEach(n => n.remove());
  history.replaceState({}, '', '/billing');
  document.body.innerHTML = '<main><button id="save">Save</button></main>';
  const data: Record<string, unknown> = {};
  area = { data, get: async k => (k in data ? { [k]: structuredClone(data[k]) } : {}), set: async i => { Object.assign(data, structuredClone(i)); } };
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: vi.fn(async (m: { type: string }) => (m.type === 'pp:screenshot' ? { ok: false, error: 'stub' } : undefined)) },
  });
  controller = new Controller(createStore(area, KEY));
  await controller.boot();
  controller.toggle();
});

afterEach(() => {
  if ((controller as unknown as { pinMode: { active: boolean } }).pinMode.active) controller.toggle();
  vi.unstubAllGlobals();
});

describe('Controller', () => {
  it('keeps a comment typed in the open bubble when the SPA route changes', async () => {
    const input = await pinSave();
    input.value = 'typed before navigating';
    history.pushState({}, '', '/settings');
    (controller as unknown as { checkUrl(): void }).checkUrl();
    await vi.waitFor(() => expect(saved().current?.page.url).toContain('/settings'));
    expect(saved().previous?.pins[0].comment).toBe('typed before navigating');
  });

  it('keeps a new pin when Esc is pressed after typing a comment', async () => {
    const input = await pinSave();
    input.value = 'keep me';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }));
    await vi.waitFor(() => expect(saved().current?.pins.map(p => p.comment)).toEqual(['keep me']));
  });

  it('discards a new pin when Esc is pressed with an empty comment', async () => {
    const input = await pinSave();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }));
    await vi.waitFor(() => expect(saved().current?.pins).toEqual([]));
  });
});
