import type { Pin } from '../../shared/schema';
import { button, h, isolateKeys } from './dom';
import type { OverlayRoot } from './root';

export interface TrayActions {
  onCopy(): void;
  onCopyJson(): void;
  onClear(): void;
  onDelete(n: number): void;
  onEdit(n: number, comment: string): void;
  onHover(n: number | null): void;
  onFocus(n: number): void;
  onRestorePrevious(): void;
}
export interface TrayState { pins: Pin[]; previousCount: number; fallbackText: string | null; }
export interface Tray { render(s: TrayState): void; }

const plural = (n: number) => `${n} ${n === 1 ? 'pin' : 'pins'}`;

export function pinSummary(pin: Pin): string {
  const e = pin.element;
  const text = e.text ? ` "${e.text.length > 32 ? `${e.text.slice(0, 31)}…` : e.text}"` : '';
  const component = pin.react?.components[0];
  return `<${e.tag}>${text}${component ? ` · ${component}` : ''}`;
}

export function createTray(root: OverlayRoot, actions: TrayActions): Tray {
  const el = h('div', 'pp-tray');
  isolateKeys(el);
  root.layer.append(el);
  let collapsed = false;
  let last: TrayState | null = null;
  let pending: TrayState | null = null;
  let pressing = false;

  const editing = () => {
    const active = root.shadow.activeElement;
    return !!active && el.contains(active) && active.classList.contains('pp-row-comment');
  };

  const flush = () => {
    if (!pending || pressing || editing()) return;
    const next = pending;
    pending = null;
    render(next);
  };
  el.addEventListener('focusout', () => queueMicrotask(flush));
  // Rebuilding between pointerdown and click would retarget the click away from the button.
  el.addEventListener('pointerdown', () => { pressing = true; });
  const release = () => setTimeout(() => { pressing = false; flush(); }, 0);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);

  function row(pin: Pin): HTMLElement {
    const r = h('div', 'pp-row');
    r.dataset.n = String(pin.n);
    const body = h('div', 'pp-row-body');
    const comment = h('textarea', 'pp-row-comment');
    comment.rows = 1;
    comment.placeholder = 'Add a comment…';
    comment.value = pin.comment;
    comment.addEventListener('change', () => actions.onEdit(pin.n, comment.value));
    comment.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        comment.blur();
      }
    });
    body.append(comment, button('pp-row-meta', pinSummary(pin), () => actions.onFocus(pin.n)));
    if (pin.status === 'detached') body.append(h('span', 'pp-row-detached', 'detached'));
    const del = button('pp-row-del', '×', () => actions.onDelete(pin.n));
    del.title = `Delete pin ${pin.n}`;
    r.append(h('span', 'pp-row-n', String(pin.n)), body, del);
    r.addEventListener('mouseenter', () => actions.onHover(pin.n));
    r.addEventListener('mouseleave', () => actions.onHover(null));
    return r;
  }

  function render(s: TrayState): void {
    if (pressing || editing()) {
      pending = s;
      return;
    }
    last = s;
    const empty = s.pins.length === 0 && s.previousCount === 0 && !s.fallbackText;
    el.style.display = empty ? 'none' : 'flex';
    if (empty) {
      el.replaceChildren();
      return;
    }
    const head = h('div', 'pp-tray-head');
    head.append(
      h('span', '', `Pinpoint · ${plural(s.pins.length)}`),
      button('pp-tray-toggle', collapsed ? '▸' : '▾', () => {
        collapsed = !collapsed;
        if (last) render(last);
      }),
    );
    const children: HTMLElement[] = [head];
    if (!collapsed) {
      const list = h('div', 'pp-tray-list');
      for (const pin of s.pins) list.append(row(pin));
      children.push(list);
      if (s.previousCount > 0) {
        children.push(button('pp-tray-prev', `Previous page: ${plural(s.previousCount)} — restore`, actions.onRestorePrevious));
      }
      if (s.fallbackText) {
        const ta = h('textarea', 'pp-tray-fallback');
        ta.readOnly = true;
        ta.value = s.fallbackText;
        children.push(h('div', 'pp-tray-hint', 'Clipboard blocked — press ⌘C / Ctrl+C to copy'), ta);
        queueMicrotask(() => { ta.focus(); ta.select(); });
      }
      const foot = h('div', 'pp-tray-foot');
      const copy = button('pp-tray-copy pp-btn pp-btn--primary', 'Copy all', actions.onCopy);
      copy.disabled = s.pins.length === 0;
      foot.append(copy, button('pp-tray-json pp-btn', 'Copy JSON', actions.onCopyJson), button('pp-tray-clear pp-btn', 'Clear', actions.onClear));
      children.push(foot);
    }
    el.replaceChildren(...children);
  }

  return { render };
}
