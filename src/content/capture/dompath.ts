import { isStableId, stableClasses } from './stability';

export function elementLabel(el: Element): string {
  if (el.id && isStableId(el.id)) return `${el.localName}#${el.id}`;
  const cls = stableClasses(el)[0];
  return cls ? `${el.localName}.${cls}` : el.localName;
}

export function domPath(el: Element, levels = 5): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && parts.length < levels) {
    if (cur.localName === 'html' || cur.localName === 'body') break;
    parts.unshift(elementLabel(cur));
    cur = cur.parentElement ?? (cur.getRootNode() as Partial<ShadowRoot>).host ?? null;
  }
  return parts.join(' > ');
}
