import { OVERLAY_CSS } from './css';

export interface OverlayRoot {
  host: HTMLElement;
  shadow: ShadowRoot;
  layer: HTMLDivElement;
  isOverlay(t: EventTarget | null): boolean;
  setHidden(hidden: boolean): void;
  ensureAttached(): void;
  destroy(): void;
}

export function createOverlayRoot(doc: Document = document): OverlayRoot {
  const host = doc.createElement('pinpoint-overlay');
  host.style.cssText = 'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = OVERLAY_CSS;
  const layer = doc.createElement('div');
  layer.className = 'pp-layer';
  shadow.append(style, layer);
  doc.documentElement.append(host);
  return {
    host,
    shadow,
    layer,
    isOverlay: t => t === host || (t instanceof Node && shadow.contains(t)),
    setHidden: hidden => { host.style.visibility = hidden ? 'hidden' : 'visible'; },
    ensureAttached: () => { if (!host.isConnected) doc.documentElement.append(host); },
    destroy: () => host.remove(),
  };
}
