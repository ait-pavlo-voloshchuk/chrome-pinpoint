import type { ReactInfo } from '../shared/schema';
import { PROBE_EVENT, PROBE_RESULT_EVENT } from '../shared/messages';

interface Fiber { type: unknown; return: Fiber | null; }

const WRAPPER = /^(Fragment|Suspense|StrictMode|Profiler|ForwardRef|Memo)$|(Provider|Context|Consumer)$/;
const MAX_COMPONENTS = 5;
const MAX_ANCESTOR_HOPS = 10;
const NONCE = /^[a-z0-9]{8,32}$/;

function fiberOf(el: Element): Fiber | null {
  for (const key of Object.keys(el)) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return (el as unknown as Record<string, Fiber>)[key];
    }
  }
  return null;
}

function nameOf(type: unknown): string | null {
  if (!type || typeof type === 'string') return null;
  if (typeof type === 'function') {
    const f = type as { displayName?: string; name?: string };
    return f.displayName || f.name || null;
  }
  if (typeof type === 'object') {
    const o = type as { displayName?: string; type?: unknown; render?: unknown };
    return o.displayName || nameOf(o.type) || nameOf(o.render) || null;
  }
  return null;
}

export function reactInfoFor(el: Element): ReactInfo | null {
  let fiber: Fiber | null = null;
  let host: Element | null = el;
  for (let i = 0; host && !fiber && i < MAX_ANCESTOR_HOPS; i++) {
    fiber = fiberOf(host);
    host = host.parentElement;
  }
  const components: string[] = [];
  for (let f = fiber; f && components.length < MAX_COMPONENTS; f = f.return) {
    const name = nameOf(f.type);
    if (!name || WRAPPER.test(name) || components[components.length - 1] === name) continue;
    components.push(name);
  }
  const source = el.closest('[data-pp-src]')?.getAttribute('data-pp-src') ?? null;
  if (!fiber && !source) return null;
  return { components, minified: components.some(n => n.length <= 2), source };
}

export function installProbe(win: Window): void {
  const w = win as Window & { __ppProbe?: boolean };
  if (w.__ppProbe) return;
  w.__ppProbe = true;
  win.addEventListener(PROBE_EVENT, e => {
    const nonce = (e as CustomEvent).detail;
    if (typeof nonce !== 'string' || !NONCE.test(nonce)) return;
    const target = e.composedPath()[0] as Node | undefined;
    const react = target && target.nodeType === Node.ELEMENT_NODE ? reactInfoFor(target as Element) : null;
    win.dispatchEvent(new CustomEvent(PROBE_RESULT_EVENT, { detail: JSON.stringify({ nonce, react }) }));
  }, true);
}
