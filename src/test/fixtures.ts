import type { ElementInfo } from '../shared/schema';
import type { NewPin } from '../content/session';

export function makeElementInfo(over: Partial<ElementInfo> = {}): ElementInfo {
  return {
    selector: 'button.primary',
    selectorMatches: 1,
    domPath: 'main > form > button.primary',
    tag: 'button',
    text: 'Save changes',
    attributes: { class: 'primary', type: 'submit' },
    box: { x: 1180, y: 612, width: 128, height: 40 },
    viewport: { width: 1440, height: 900, dpr: 2 },
    styles: {
      layout: { display: 'inline-flex' },
      spacing: { padding: '8px 16px' },
      typography: { 'font-family': 'Inter', 'font-size': '14px', 'line-height': '20px', 'font-weight': '500', color: '#ffffff' },
      visual: { 'background-color': '#6b7280', 'border-radius': '6px' },
    },
    ...over,
  };
}

export function makeNewPin(over: Partial<NewPin> = {}): NewPin {
  return {
    comment: 'Make it primary',
    createdAt: '2026-10-05T10:42:13.000Z',
    status: 'attached',
    element: makeElementInfo(),
    react: null,
    screenshot: null,
    ...over,
  };
}
