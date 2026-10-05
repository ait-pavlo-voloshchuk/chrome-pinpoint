import type { ReactInfo } from '../shared/schema';
import { PROBE_EVENT, PROBE_RESULT_EVENT } from '../shared/messages';

/** Asks the main-world probe about an element. Never rejects; null on timeout or no React. */
export function probeReact(el: Element, timeoutMs = 150, win: Window = window): Promise<ReactInfo | null> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  return new Promise(resolve => {
    const done = (v: ReactInfo | null) => {
      win.removeEventListener(PROBE_RESULT_EVENT, onResult);
      clearTimeout(timer);
      resolve(v);
    };
    const onResult = (e: Event) => {
      try {
        const d = JSON.parse((e as CustomEvent<string>).detail) as { nonce?: unknown; react?: unknown };
        if (d.nonce === nonce) done(sanitizeReactInfo(d.react));
      } catch {
        /* not ours */
      }
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    win.addEventListener(PROBE_RESULT_EVENT, onResult);
    el.dispatchEvent(new CustomEvent(PROBE_EVENT, { detail: nonce, bubbles: true, composed: true }));
  });
}

/** The page can see and forge probe replies; accept only well-typed, bounded data. */
export function sanitizeReactInfo(v: unknown): ReactInfo | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const components = Array.isArray(o.components)
    ? o.components.filter((c): c is string => typeof c === 'string').slice(0, 5).map(c => stripControl(c).slice(0, 80))
    : [];
  return {
    components,
    minified: o.minified === true,
    source: typeof o.source === 'string' ? stripControl(o.source).slice(0, 300) : null,
  };
}

function stripControl(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ');
}
