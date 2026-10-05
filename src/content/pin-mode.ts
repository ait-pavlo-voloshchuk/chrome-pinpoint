export interface PinModeHooks {
  isOverlay(target: EventTarget | null): boolean;
  onTarget(el: Element | null): void;
  onPick(el: Element): void;
  onDismiss(): void;
  onEscape(): void;
}

const BLOCKED = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick'] as const;

export class PinMode {
  suspended = false;
  private _active = false;
  private _target: Element | null = null;
  private hovered: Element | null = null;
  private trail: Element[] = [];
  private windows: Window[] = [];

  constructor(private readonly win: Window, private readonly hooks: PinModeHooks) {}

  get active(): boolean { return this._active; }
  get target(): Element | null { return this._target; }

  enter(): void {
    if (this._active) return;
    this._active = true;
    this.windows = [this.win, ...sameOriginFrames(this.win.document)];
    for (const w of this.windows) {
      w.addEventListener('mousemove', this.onMove, true);
      w.addEventListener('keydown', this.onKey, true);
      for (const t of BLOCKED) w.addEventListener(t, this.onBlock, true);
    }
  }

  exit(): void {
    if (!this._active) return;
    for (const w of this.windows) {
      w.removeEventListener('mousemove', this.onMove, true);
      w.removeEventListener('keydown', this.onKey, true);
      for (const t of BLOCKED) w.removeEventListener(t, this.onBlock, true);
    }
    this.windows = [];
    this._active = false;
    this.suspended = false;
    this.hovered = null;
    this.trail = [];
    this.setTarget(null);
  }

  private setTarget(el: Element | null): void {
    this._target = el;
    this.hooks.onTarget(el);
  }

  private resolve(e: Event): Element | null {
    const first = e.composedPath()[0] as Node | undefined;
    if (!first || first.nodeType !== Node.ELEMENT_NODE) return null;
    const el = first as Element;
    if (this.hooks.isOverlay(el) || el === el.ownerDocument.documentElement) return null;
    return el;
  }

  private onMove = (e: Event): void => {
    if (this.suspended) return;
    const el = this.resolve(e);
    if (el === this.hovered) return;
    this.hovered = el;
    this.trail = [];
    this.setTarget(el);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (this.hooks.isOverlay(e.target)) return;
    if (e.key === 'Escape') {
      swallow(e);
      this.hooks.onEscape();
      return;
    }
    if (this.suspended || !this._target || isEditable(e.target)) return;
    if (e.key === 'ArrowUp') {
      swallow(e);
      const parent = parentOf(this._target);
      if (parent) {
        this.trail.push(this._target);
        this.setTarget(parent);
      }
    } else if (e.key === 'ArrowDown') {
      swallow(e);
      const child = this.trail.pop();
      if (child) this.setTarget(child);
    }
  };

  private onBlock = (e: Event): void => {
    if (this.hooks.isOverlay(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'click') return;
    if (this.suspended) {
      this.hooks.onDismiss();
      return;
    }
    const el = this._target ?? this.resolve(e);
    if (el) this.hooks.onPick(el);
  };
}

function swallow(e: Event): void {
  e.preventDefault();
  e.stopImmediatePropagation();
}

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  return el.isContentEditable || ['input', 'textarea', 'select'].includes(el.localName);
}

/** Parent across shadow and same-origin iframe boundaries; stops below <html>. */
function parentOf(el: Element): Element | null {
  const root = el.getRootNode() as Partial<ShadowRoot>;
  const p = el.parentElement ?? root.host ?? null;
  if (p && p !== el.ownerDocument.documentElement) return p;
  return el.ownerDocument.defaultView?.frameElement ?? null;
}

function sameOriginFrames(doc: Document): Window[] {
  const out: Window[] = [];
  for (const frame of Array.from(doc.querySelectorAll('iframe'))) {
    try {
      const w = frame.contentWindow;
      if (w && w.document) out.push(w, ...sameOriginFrames(w.document));
    } catch {
      /* cross-origin */
    }
  }
  return out;
}
