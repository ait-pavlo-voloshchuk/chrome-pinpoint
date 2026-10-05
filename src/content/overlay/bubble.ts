import { rectInTopViewport } from '../capture/geometry';
import { h, isolateKeys } from './dom';
import type { OverlayRoot } from './root';

export interface BubbleOptions {
  n: number;
  anchor: Element;
  initial: string;
  onSave(text: string): void;
  /** Esc pressed; receives the text typed so far. */
  onCancel(text: string): void;
}
export interface Bubble {
  open(o: BubbleOptions): void;
  close(): void;
  commit(): void;
  cancel(): void;
  readonly isOpen: boolean;
}

const WIDTH = 280;

export function createBubble(root: OverlayRoot): Bubble {
  let el: HTMLElement | null = null;
  let input: HTMLTextAreaElement | null = null;
  let opts: BubbleOptions | null = null;

  const close = () => {
    el?.remove();
    el = null;
    input = null;
    opts = null;
  };
  const commit = () => {
    if (!opts || !input) return;
    const { onSave } = opts;
    const text = input.value;
    close();
    onSave(text);
  };
  const cancel = () => {
    if (!opts || !input) return;
    const { onCancel } = opts;
    const text = input.value;
    close();
    onCancel(text);
  };

  return {
    get isOpen() { return el !== null; },
    open(o) {
      close();
      opts = o;
      el = h('div', 'pp-bubble');
      input = h('textarea', 'pp-bubble-input');
      input.rows = 3;
      input.placeholder = 'What should change here?';
      input.value = o.initial;
      el.append(h('div', 'pp-bubble-head', `Pin ${o.n}`), input, h('div', 'pp-bubble-hint', 'Enter to save · Shift+Enter for newline · Esc to cancel'));
      isolateKeys(el);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      });
      const r = rectInTopViewport(o.anchor);
      const left = Math.min(Math.max(8, r.x), window.innerWidth - WIDTH - 8);
      const below = r.y + r.height + 8;
      const top = below + 120 < window.innerHeight ? below : Math.max(8, r.y - 128);
      Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${WIDTH}px` });
      root.layer.append(el);
      input.focus();
    },
    close,
    commit,
    cancel,
  };
}
