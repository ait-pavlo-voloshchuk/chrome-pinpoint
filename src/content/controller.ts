import { describeElement } from './capture/describe';
import { rectInTopViewport } from './capture/geometry';
import { resolveSelector } from './capture/resolve';
import { createBubble } from './overlay/bubble';
import { createHighlighter } from './overlay/highlighter';
import { createMarkers } from './overlay/markers';
import { createOverlayRoot } from './overlay/root';
import { toast } from './overlay/toast';
import { createTray } from './overlay/tray';
import { PinMode } from './pin-mode';
import { probeReact } from './probe-client';
import {
  addPin, clearPins, discardNewPin, removePin, sessionFor, setStatuses, swapPrevious, updateComment,
  type StoreState,
} from './session';
import type { PinStore } from './store';
import { toJson, toMarkdown } from '../shared/markdown';
import type { ScreenshotResult, ToBackground } from '../shared/messages';
import type { Pin, PinSession, Screenshot } from '../shared/schema';

const MUTATION_DEBOUNCE_MS = 200;
const URL_POLL_MS = 1000;

export class Controller {
  private state: StoreState = { current: null, previous: null };
  private readonly elements = new Map<number, Element>();
  private readonly root = createOverlayRoot();
  private readonly highlighter = createHighlighter(this.root);
  private readonly markers = createMarkers(this.root);
  private readonly bubble = createBubble(this.root);
  private readonly tray = createTray(this.root, {
    onCopy: () => void this.copy(toMarkdown(this.session), `Copied ${this.session.pins.length} ${this.session.pins.length === 1 ? 'pin' : 'pins'}`),
    onCopyJson: () => void this.copy(toJson(this.session), 'Copied JSON'),
    onClear: () => {
      this.elements.clear();
      void this.commit({ ...this.state, current: clearPins(this.session, new Date()) });
    },
    onDelete: n => {
      this.elements.delete(n);
      void this.commit({ ...this.state, current: removePin(this.session, n) });
    },
    onEdit: (n, comment) => void this.commit({ ...this.state, current: updateComment(this.session, n, comment) }),
    onHover: n => this.hoverPin(n),
    onFocus: n => this.elements.get(n)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    onRestorePrevious: () => {
      this.elements.clear();
      this.state = swapPrevious(this.state);
      this.resolveElements();
      void this.commit(this.state);
    },
  });
  private readonly pinMode = new PinMode(window, {
    isOverlay: t => this.root.isOverlay(t),
    onTarget: el => (el ? this.highlighter.show(el) : this.highlighter.hide()),
    onPick: el => void this.pick(el),
    onDismiss: () => this.bubble.commit(),
    onEscape: () => (this.bubble.isOpen ? this.bubble.cancel() : this.toggle()),
  });
  private fallbackText: string | null = null;
  private screenshotWarned = false;
  private lastUrl = location.href;
  private frame = 0;

  constructor(private readonly store: PinStore) {}

  private get session(): PinSession {
    if (!this.state.current) throw new Error('Pinpoint session not initialized');
    return this.state.current;
  }

  async boot(): Promise<void> {
    this.state = sessionFor(await this.store.load(), location.href, document.title, new Date());
    this.resolveElements();
    await this.commit(this.state);
    window.addEventListener('scroll', this.onViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', this.onViewportChange, { passive: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => this.onMutation(), MUTATION_DEBOUNCE_MS);
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    setInterval(() => this.checkUrl(), URL_POLL_MS);
  }

  toggle(): void {
    if (this.pinMode.active) {
      if (this.bubble.isOpen) this.bubble.commit();
      this.pinMode.exit();
    } else {
      this.pinMode.enter();
    }
    this.notifyBadge();
  }

  private async pick(el: Element): Promise<void> {
    this.pinMode.suspended = true;
    this.highlighter.hide();
    const { id, nextN } = this.session;
    const element = describeElement(el);
    const [react, screenshot] = await Promise.all([probeReact(el), this.capture(el, id, nextN)]);
    const { session, pin } = addPin(this.session, {
      comment: '',
      createdAt: new Date().toISOString(),
      status: 'attached',
      element,
      react,
      screenshot,
    });
    this.elements.set(pin.n, el);
    await this.commit({ ...this.state, current: session });
    this.openBubble(pin, el);
  }

  private openBubble(pin: Pin, anchor: Element): void {
    this.bubble.open({
      n: pin.n,
      anchor,
      initial: pin.comment,
      onSave: text => {
        this.pinMode.suspended = false;
        void this.commit({ ...this.state, current: updateComment(this.session, pin.n, text) });
      },
      onCancel: text => {
        this.pinMode.suspended = false;
        if (text.trim()) {
          void this.commit({ ...this.state, current: updateComment(this.session, pin.n, text) });
          return;
        }
        this.elements.delete(pin.n);
        void this.commit({ ...this.state, current: discardNewPin(this.session, pin.n) });
      },
    });
  }

  private async capture(el: Element, sessionId: string, n: number): Promise<Screenshot | null> {
    const rect = rectInTopViewport(el);
    this.root.setHidden(true);
    await nextFrames(2);
    try {
      const res = await chrome.runtime.sendMessage<ToBackground, ScreenshotResult>({
        type: 'pp:screenshot',
        rect,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        sessionId,
        n,
      });
      if (res?.ok) return res.screenshot;
      this.warnScreenshot(res?.error ?? 'no response');
      return null;
    } catch (err) {
      this.warnScreenshot(String(err));
      return null;
    } finally {
      this.root.setHidden(false);
    }
  }

  private warnScreenshot(reason: string): void {
    console.warn('[pinpoint] screenshot skipped:', reason);
    if (this.screenshotWarned) return;
    this.screenshotWarned = true;
    toast(this.root, 'Screenshot skipped');
  }

  private async copy(text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.fallbackText = null;
      toast(this.root, message);
    } catch {
      this.fallbackText = text;
      toast(this.root, 'Press ⌘C / Ctrl+C to copy');
    }
    this.render();
  }

  private hoverPin(n: number | null): void {
    this.markers.highlight(n);
    const el = n === null ? this.pinMode.target : this.elements.get(n) ?? null;
    if (el) this.highlighter.show(el);
    else this.highlighter.hide();
  }

  /** Re-finds pinned elements and returns true if any status changed. */
  private resolveElements(): boolean {
    const current = this.state.current;
    if (!current) return false;
    const statuses = new Map<number, Pin['status']>();
    for (const pin of current.pins) {
      let el = this.elements.get(pin.n);
      if (!el?.isConnected) {
        el = resolveSelector(pin.element.selector) ?? undefined;
        if (el) this.elements.set(pin.n, el);
        else this.elements.delete(pin.n);
      }
      statuses.set(pin.n, el ? 'attached' : 'detached');
    }
    const next = setStatuses(current, statuses);
    if (next === current) return false;
    this.state = { ...this.state, current: next };
    return true;
  }

  private onMutation(): void {
    this.root.ensureAttached();
    if (this.resolveElements()) void this.commit(this.state);
    else this.markers.reposition();
  }

  private onViewportChange = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.markers.reposition();
      if (this.pinMode.target) this.highlighter.show(this.pinMode.target);
    });
  };

  private checkUrl(): void {
    if (location.href === this.lastUrl) return;
    this.lastUrl = location.href;
    if (this.bubble.isOpen) this.bubble.commit(); // save the comment into the session being archived
    const next = sessionFor(this.state, location.href, document.title, new Date());
    if (next === this.state) return;
    this.elements.clear();
    this.state = next;
    this.resolveElements();
    void this.commit(this.state);
  }

  private async commit(state: StoreState): Promise<void> {
    this.state = state;
    this.render();
    await this.store.save(this.state);
  }

  private render(): void {
    const s = this.state.current;
    if (!s) return;
    this.markers.render(s.pins.map(p => ({ n: p.n, el: this.elements.get(p.n) ?? null })));
    this.tray.render({ pins: s.pins, previousCount: this.state.previous?.pins.length ?? 0, fallbackText: this.fallbackText });
    this.notifyBadge();
  }

  private notifyBadge(): void {
    const count = this.state.current?.pins.length ?? 0;
    void chrome.runtime.sendMessage<ToBackground>({ type: 'pp:badge', count, active: this.pinMode.active }).catch(() => {});
  }
}

function nextFrames(n: number): Promise<void> {
  return new Promise(resolve => {
    const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });
}
