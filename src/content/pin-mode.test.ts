import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { PinMode, type PinModeHooks } from './pin-mode';

let overlay: HTMLElement;
type MockHooks = { [K in keyof PinModeHooks]: Mock<PinModeHooks[K]> };
let hooks: MockHooks;
let mode: PinMode;

const move = (el: Element) => el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, composed: true }));
const click = (el: Element) => {
  const e = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(e);
  return e;
};
const key = (k: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.innerHTML = '<main><div class="actions"><button id="save">Save</button></div></main><pinpoint-overlay></pinpoint-overlay>';
  overlay = document.querySelector('pinpoint-overlay')!;
  hooks = {
    isOverlay: vi.fn((t: EventTarget | null) => t === overlay),
    onTarget: vi.fn(),
    onPick: vi.fn(),
    onDismiss: vi.fn(),
    onEscape: vi.fn(),
  } as unknown as MockHooks;
  mode = new PinMode(window, hooks);
  mode.enter();
});
afterEach(() => mode.exit());

describe('PinMode', () => {
  it('targets the hovered element', () => {
    const btn = document.getElementById('save')!;
    move(btn);
    expect(mode.target).toBe(btn);
    expect(hooks.onTarget).toHaveBeenLastCalledWith(btn);
  });

  it('walks to the parent with ArrowUp and back with ArrowDown', () => {
    const btn = document.getElementById('save')!;
    move(btn);
    key('ArrowUp');
    expect(mode.target).toBe(btn.parentElement);
    key('ArrowUp');
    expect(mode.target?.localName).toBe('main');
    key('ArrowDown');
    key('ArrowDown');
    expect(mode.target).toBe(btn);
  });

  it('does not climb above body', () => {
    move(document.body);
    key('ArrowUp');
    expect(mode.target).toBe(document.body);
  });

  it('keeps the walked target while the pointer stays on the same element', () => {
    const btn = document.getElementById('save')!;
    move(btn);
    key('ArrowUp');
    move(btn);
    expect(mode.target).toBe(btn.parentElement);
  });

  it('picks the current target and swallows the page click', () => {
    const btn = document.getElementById('save')!;
    const pageHandler = vi.fn();
    btn.addEventListener('click', pageHandler);
    move(btn);
    key('ArrowUp');
    const e = click(btn);
    expect(e.defaultPrevented).toBe(true);
    expect(pageHandler).not.toHaveBeenCalled();
    expect(hooks.onPick).toHaveBeenCalledWith(btn.parentElement);
  });

  it('lets overlay clicks through', () => {
    const e = click(overlay);
    expect(e.defaultPrevented).toBe(false);
    expect(hooks.onPick).not.toHaveBeenCalled();
  });

  it('ignores hovering the overlay', () => {
    move(overlay);
    expect(mode.target).toBeNull();
  });

  it('dismisses instead of picking while suspended', () => {
    const btn = document.getElementById('save')!;
    move(btn);
    mode.suspended = true;
    const e = click(btn);
    expect(e.defaultPrevented).toBe(true);
    expect(hooks.onDismiss).toHaveBeenCalledOnce();
    expect(hooks.onPick).not.toHaveBeenCalled();
  });

  it('keeps handled keys away from page listeners', () => {
    const pageKeys = vi.fn();
    document.addEventListener('keydown', pageKeys);
    move(document.getElementById('save')!);
    key('ArrowUp');
    key('Escape');
    document.removeEventListener('keydown', pageKeys);
    expect(pageKeys).not.toHaveBeenCalled();
  });

  it('leaves arrow keys alone while the user types in a page input', () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="q">');
    const input = document.getElementById('q')!;
    move(input);
    const e = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    input.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(mode.target).toBe(input);
  });

  it('forwards Escape', () => {
    key('Escape');
    expect(hooks.onEscape).toHaveBeenCalledOnce();
  });

  it('stops intercepting after exit', () => {
    mode.exit();
    const btn = document.getElementById('save')!;
    expect(click(btn).defaultPrevented).toBe(false);
    expect(hooks.onTarget).toHaveBeenLastCalledWith(null);
  });
});
