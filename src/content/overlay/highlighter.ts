import { elementLabel } from '../capture/dompath';
import { rectInTopViewport } from '../capture/geometry';
import { h } from './dom';
import type { OverlayRoot } from './root';

export interface Highlighter { show(el: Element): void; hide(): void; }

export function createHighlighter(root: OverlayRoot): Highlighter {
  const box = h('div', 'pp-hl');
  const label = h('div', 'pp-hl-label');
  root.layer.append(box, label);
  return {
    show(el) {
      const r = rectInTopViewport(el);
      Object.assign(box.style, { display: 'block', left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
      label.textContent = `${elementLabel(el)}  ${Math.round(r.width)}×${Math.round(r.height)}`;
      const top = r.y >= 24 ? r.y - 22 : r.y + r.height + 4;
      Object.assign(label.style, { display: 'block', left: `${Math.max(0, r.x)}px`, top: `${top}px` });
    },
    hide() {
      box.style.display = 'none';
      label.style.display = 'none';
    },
  };
}
