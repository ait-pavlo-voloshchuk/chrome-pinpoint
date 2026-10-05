import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createOverlayRoot, type OverlayRoot } from './root';
import { createBubble } from './bubble';
import { createTray, pinSummary, type TrayActions } from './tray';
import { createHighlighter } from './highlighter';
import { addPin, newSession } from '../session';
import { makeElementInfo, makeNewPin } from '../../test/fixtures';

let root: OverlayRoot;
beforeEach(() => {
  document.documentElement.querySelectorAll('pinpoint-overlay').forEach(n => n.remove());
  document.body.innerHTML = '<button id="target">Save</button>';
  root = createOverlayRoot();
});

const pins = () => {
  let s = newSession('https://a.test/', 'A', new Date(0));
  s = addPin(s, makeNewPin({ comment: 'First' })).session;
  s = addPin(s, makeNewPin({ comment: 'Second', status: 'detached', react: { components: ['SaveButton'], minified: false, source: null } })).session;
  return s.pins;
};
type MockActions = { [K in keyof TrayActions]: Mock<TrayActions[K]> };
const actions = (): MockActions => ({
  onCopy: vi.fn(), onCopyJson: vi.fn(), onClear: vi.fn(), onDelete: vi.fn(), onEdit: vi.fn(),
  onHover: vi.fn(), onFocus: vi.fn(), onRestorePrevious: vi.fn(),
}) as unknown as MockActions;
const q = <T extends Element = HTMLElement>(sel: string) => root.shadow.querySelector<T>(sel);

describe('overlay root', () => {
  it('mounts a shadow host on <html> and recognizes its own nodes', () => {
    expect(root.host.parentElement).toBe(document.documentElement);
    expect(root.isOverlay(root.host)).toBe(true);
    expect(root.isOverlay(root.layer)).toBe(true);
    expect(root.isOverlay(document.body)).toBe(false);
    expect(root.isOverlay(null)).toBe(false);
  });

  it('hides for screenshots', () => {
    root.setHidden(true);
    expect(root.host.style.visibility).toBe('hidden');
    root.setHidden(false);
    expect(root.host.style.visibility).toBe('visible');
  });

  it('re-attaches after the page removes it', () => {
    root.host.remove();
    root.ensureAttached();
    expect(root.host.isConnected).toBe(true);
  });
});

describe('highlighter', () => {
  it('labels the element with its size', () => {
    const hl = createHighlighter(root);
    hl.show(document.getElementById('target')!);
    expect(q('.pp-hl-label')!.textContent).toBe('button#target  0×0');
    hl.hide();
    expect(q<HTMLElement>('.pp-hl')!.style.display).toBe('none');
  });
});

describe('bubble', () => {
  const open = (onSave = vi.fn(), onCancel = vi.fn()) => {
    const bubble = createBubble(root);
    bubble.open({ n: 1, anchor: document.getElementById('target')!, initial: 'hi', onSave, onCancel });
    return { bubble, onSave, onCancel, ta: q<HTMLTextAreaElement>('.pp-bubble-input')! };
  };
  const press = (el: Element, key: string, shiftKey = false) =>
    el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, composed: true, cancelable: true }));

  it('saves on Enter and closes', () => {
    const { bubble, onSave, ta } = open();
    ta.value = 'Make it bigger';
    press(ta, 'Enter');
    expect(onSave).toHaveBeenCalledWith('Make it bigger');
    expect(bubble.isOpen).toBe(false);
  });

  it('keeps editing on Shift+Enter', () => {
    const { bubble, onSave, ta } = open();
    press(ta, 'Enter', true);
    expect(onSave).not.toHaveBeenCalled();
    expect(bubble.isOpen).toBe(true);
  });

  it('cancels on Escape', () => {
    const { onCancel, ta } = open();
    press(ta, 'Escape');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('passes the typed text to onCancel', () => {
    const { onCancel, ta } = open();
    ta.value = 'half-written';
    press(ta, 'Escape');
    expect(onCancel).toHaveBeenCalledWith('half-written');
  });

  it('commit() saves the current text', () => {
    const { bubble, onSave, ta } = open();
    ta.value = 'via click outside';
    bubble.commit();
    expect(onSave).toHaveBeenCalledWith('via click outside');
  });

  it('does not leak keystrokes to page listeners', () => {
    const pageKeys = vi.fn();
    document.addEventListener('keydown', pageKeys);
    const { ta } = open();
    press(ta, 'a');
    press(ta, 'Enter');
    document.removeEventListener('keydown', pageKeys);
    expect(pageKeys).not.toHaveBeenCalled();
  });
});

describe('tray', () => {
  it('lists pins and wires actions', () => {
    const a = actions();
    createTray(root, a).render({ pins: pins(), previousCount: 0, fallbackText: null });
    const rows = root.shadow.querySelectorAll<HTMLElement>('.pp-row');
    expect(rows).toHaveLength(2);
    expect(rows[1].dataset.n).toBe('2');
    expect(rows[1].querySelector('.pp-row-detached')).not.toBeNull();
    rows[1].querySelector<HTMLButtonElement>('.pp-row-del')!.click();
    expect(a.onDelete).toHaveBeenCalledWith(2);
    q<HTMLButtonElement>('.pp-tray-copy')!.click();
    expect(a.onCopy).toHaveBeenCalledOnce();
  });

  it('hides when there is nothing to show', () => {
    createTray(root, actions()).render({ pins: [], previousCount: 0, fallbackText: null });
    expect(q<HTMLElement>('.pp-tray')!.style.display).toBe('none');
  });

  it('shows the clipboard fallback text', () => {
    createTray(root, actions()).render({ pins: pins(), previousCount: 0, fallbackText: '## md' });
    expect(q<HTMLTextAreaElement>('.pp-tray-fallback')!.value).toBe('## md');
  });

  it('does not replace a comment the user is editing', () => {
    const tray = createTray(root, actions());
    tray.render({ pins: pins(), previousCount: 0, fallbackText: null });
    const ta = q<HTMLTextAreaElement>('.pp-row-comment')!;
    ta.focus();
    ta.value = 'typing…';
    tray.render({ pins: pins(), previousCount: 1, fallbackText: null });
    expect(q<HTMLTextAreaElement>('.pp-row-comment')).toBe(ta);
    expect(ta.value).toBe('typing…');
  });

  it('does not rebuild the tray between pointerdown and click', async () => {
    const tray = createTray(root, actions());
    tray.render({ pins: pins(), previousCount: 0, fallbackText: null });
    const copy = q<HTMLButtonElement>('.pp-tray-copy')!;
    copy.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    tray.render({ pins: pins(), previousCount: 1, fallbackText: null });
    expect(q('.pp-tray-copy')).toBe(copy);
    copy.dispatchEvent(new Event('pointerup', { bubbles: true, composed: true }));
    await new Promise(r => setTimeout(r, 10));
    expect(q('.pp-tray-copy')).not.toBe(copy);
    expect(q('.pp-tray-prev')).not.toBeNull();
  });

  it('summarizes a pin', () => {
    const [, second] = pins();
    expect(pinSummary(second)).toBe('<button> "Save changes" · SaveButton');
    expect(pinSummary({ ...second, element: makeElementInfo({ text: null }), react: null })).toBe('<button>');
  });
});
