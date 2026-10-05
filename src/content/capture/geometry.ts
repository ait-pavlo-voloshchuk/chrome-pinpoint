import type { Box } from '../../shared/schema';

/** Element rect in the top window's viewport, adding same-origin iframe offsets. */
export function rectInTopViewport(el: Element): Box {
  const r = el.getBoundingClientRect();
  let x = r.left;
  let y = r.top;
  let win: Window | null = el.ownerDocument.defaultView;
  while (win && win !== window) {
    const frame = win.frameElement;
    if (!frame) break;
    const fr = frame.getBoundingClientRect();
    x += fr.left + frame.clientLeft;
    y += fr.top + frame.clientTop;
    win = frame.ownerDocument.defaultView;
  }
  return { x, y, width: r.width, height: r.height };
}
