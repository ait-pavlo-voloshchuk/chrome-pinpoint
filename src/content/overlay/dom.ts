export function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = h('button', className, text);
  b.type = 'button';
  b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return b;
}

/** Keeps keystrokes typed into overlay inputs away from page hotkey handlers. */
export function isolateKeys(el: HTMLElement): void {
  for (const t of ['keydown', 'keyup', 'keypress']) el.addEventListener(t, e => e.stopPropagation());
}
