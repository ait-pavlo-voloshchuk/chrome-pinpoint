import { h } from './dom';
import type { OverlayRoot } from './root';

export function toast(root: OverlayRoot, message: string, ms = 2200): void {
  const t = h('div', 'pp-toast', message);
  root.layer.append(t);
  setTimeout(() => t.remove(), ms);
}
