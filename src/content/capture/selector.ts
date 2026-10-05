import { cssEscape, isStableId, stableClasses } from './stability';

export interface SelectorResult { selector: string; matches: number; }

const TEST_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-qa'];
const LABEL_ATTRS = ['aria-label', 'name', 'role'];
const MAX_DEPTH = 8;

export function buildSelector(el: Element): SelectorResult {
  const root = el.getRootNode() as Node;
  const local = localSelector(el, root as unknown as ParentNode);
  let prefix = '';
  const host = (root as Partial<ShadowRoot>).host;
  if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && host) {
    prefix = `${buildSelector(host).selector} >>> `;
  } else {
    const frame = el.ownerDocument.defaultView?.frameElement;
    if (frame) prefix = `${buildSelector(frame).selector} >>> `;
  }
  return { selector: prefix + local.selector, matches: local.matches };
}

function localSelector(el: Element, scope: ParentNode): SelectorResult {
  const own = firstUnique(el, scope);
  if (own) return { selector: own, matches: 1 };
  const parts = [segment(el)];
  let cur = el.parentElement;
  for (let depth = 1; cur && depth < MAX_DEPTH; depth++) {
    const anchor = firstUnique(cur, scope);
    if (anchor) {
      const selector = [anchor, ...parts].join(' > ');
      return { selector, matches: count(scope, selector) };
    }
    parts.unshift(segment(cur));
    cur = cur.parentElement;
  }
  const selector = parts.join(' > ');
  return { selector, matches: count(scope, selector) };
}

function attr(name: string, value: string): string {
  return `[${name}="${value.replace(/["\\]/g, '\\$&')}"]`;
}

function classSuffix(el: Element, max: number): string {
  return stableClasses(el).slice(0, max).map(c => `.${cssEscape(c)}`).join('');
}

function candidates(el: Element): string[] {
  const tag = cssEscape(el.localName);
  const out: string[] = [];
  if (el.id && isStableId(el.id)) out.push(`#${cssEscape(el.id)}`);
  for (const a of TEST_ATTRS) {
    const v = el.getAttribute(a);
    if (v) out.push(attr(a, v));
  }
  for (const a of LABEL_ATTRS) {
    const v = el.getAttribute(a);
    if (v) out.push(tag + attr(a, v));
  }
  const classes = classSuffix(el, 3);
  if (classes) out.push(tag + classes);
  out.push(tag);
  return out;
}

function count(scope: ParentNode, selector: string): number {
  try {
    return scope.querySelectorAll(selector).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function firstUnique(el: Element, scope: ParentNode): string | null {
  return candidates(el).find(c => count(scope, c) === 1) ?? null;
}

/** One path step: tag + up to 2 stable classes + nth-of-type when siblings share the tag. */
function segment(el: Element): string {
  let s = cssEscape(el.localName) + classSuffix(el, 2);
  const siblings = (el.parentNode as ParentNode | null)?.children;
  if (siblings) {
    const same = Array.from(siblings).filter(c => c.localName === el.localName);
    if (same.length > 1) s += `:nth-of-type(${same.indexOf(el) + 1})`;
  }
  return s;
}
