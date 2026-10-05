import type { ElementInfo } from '../../shared/schema';
import { domPath } from './dompath';
import { buildSelector } from './selector';
import { curatedStyles } from './styles';

const ATTRS = new Set(['id', 'class', 'role', 'href', 'src', 'alt', 'type', 'name', 'placeholder', 'data-testid']);
const MAX_TEXT = 80;
const MAX_ATTR = 120;

export function describeElement(el: Element): ElementInfo {
  const win = el.ownerDocument.defaultView ?? window;
  const { selector, matches } = buildSelector(el);
  const r = el.getBoundingClientRect();
  return {
    selector,
    selectorMatches: matches,
    domPath: domPath(el),
    tag: el.localName,
    text: elementText(el),
    attributes: pickAttributes(el),
    box: {
      x: Math.round(r.left + win.scrollX),
      y: Math.round(r.top + win.scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
    },
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    styles: curatedStyles(win.getComputedStyle(el)),
  };
}

function elementText(el: Element): string | null {
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? '';
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > MAX_TEXT ? `${t.slice(0, MAX_TEXT - 1)}…` : t;
}

function pickAttributes(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { name, value } of Array.from(el.attributes)) {
    if (!ATTRS.has(name) && !name.startsWith('aria-')) continue;
    out[name] = value.length > MAX_ATTR ? `${value.slice(0, MAX_ATTR - 1)}…` : value;
  }
  return out;
}
