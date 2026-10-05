import { rectInTopViewport } from '../capture/geometry';
import { h } from './dom';
import type { OverlayRoot } from './root';

export interface MarkerItem { n: number; el: Element | null; }
export interface Markers {
  render(items: MarkerItem[]): void;
  reposition(): void;
  highlight(n: number | null): void;
}

export function createMarkers(root: OverlayRoot): Markers {
  const layer = h('div');
  root.layer.append(layer);
  let items: MarkerItem[] = [];
  const nodes = new Map<number, HTMLElement>();

  const place = (node: HTMLElement, el: Element | null) => {
    if (!el || !el.isConnected) {
      node.style.display = 'none';
      return;
    }
    const r = rectInTopViewport(el);
    Object.assign(node.style, { display: 'flex', left: `${r.x - 10}px`, top: `${r.y - 10}px` });
  };

  return {
    render(next) {
      items = next;
      nodes.clear();
      layer.replaceChildren();
      for (const it of items) {
        const node = h('div', 'pp-marker', String(it.n));
        nodes.set(it.n, node);
        layer.append(node);
        place(node, it.el);
      }
    },
    reposition() {
      for (const it of items) {
        const node = nodes.get(it.n);
        if (node) place(node, it.el);
      }
    },
    highlight(n) {
      for (const [k, node] of nodes) node.classList.toggle('pp-marker--hot', k === n);
    },
  };
}
