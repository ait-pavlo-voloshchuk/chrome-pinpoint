const UNSTABLE_ID = /\d{4,}|[a-f0-9]{8,}|^[:«]r|^radix-|^headlessui-/;

const HASHED_CLASS: RegExp[] = [
  /^css-[a-z0-9]+$/i,           // emotion
  /^sc-/,                        // styled-components
  /^_[a-zA-Z0-9]{5,}$/,          // generic hash
  /__[a-zA-Z0-9_-]{5}$/,         // css-modules (webpack)
  /^_[\w-]+_[a-z0-9]{5}_\d+$/,   // css-modules (vite)
  /^jsx-\d+$/,                   // styled-jsx
  /^svelte-[a-z0-9]+$/,
  /[[\]:]/,                      // tailwind variants / arbitrary values
];

export function isStableId(id: string): boolean {
  return id.length > 0 && !UNSTABLE_ID.test(id);
}

export function stableClasses(el: Element): string[] {
  return Array.from(el.classList).filter(c => !HASHED_CLASS.some(r => r.test(c)));
}

/** CSS.escape with a spec-compliant fallback (jsdom lacks it). */
export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const code = value.charCodeAt(i);
    if (code === 0) { out += '\uFFFD'; continue; }
    const isDigit = code >= 48 && code <= 57;
    if ((code >= 1 && code <= 31) || code === 127 || (i === 0 && isDigit) || (i === 1 && isDigit && value.charCodeAt(0) === 45)) {
      out += `\\${code.toString(16)} `;
      continue;
    }
    if (i === 0 && value.length === 1 && code === 45) { out += `\\${ch}`; continue; }
    if (code >= 128 || code === 45 || code === 95 || isDigit || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      out += ch;
      continue;
    }
    out += `\\${ch}`;
  }
  return out;
}
