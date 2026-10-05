/** Resolves a selector produced by buildSelector, following " >>> " shadow/iframe hops. */
export function resolveSelector(selector: string, doc: Document = document): Element | null {
  const parts = selector.split(' >>> ');
  let scope: ParentNode | null = doc;
  let el: Element | null = null;
  for (let i = 0; i < parts.length; i++) {
    if (!scope) return null;
    try {
      el = scope.querySelector(parts[i]);
    } catch {
      return null;
    }
    if (!el) return null;
    if (i < parts.length - 1) scope = el.shadowRoot ?? frameDocument(el);
  }
  return el;
}

function frameDocument(el: Element): Document | null {
  try {
    return (el as HTMLIFrameElement).contentDocument ?? null;
  } catch {
    return null;
  }
}
