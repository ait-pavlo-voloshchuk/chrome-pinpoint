import type { GroupedStyles } from '../../shared/schema';

export interface StyleSource { getPropertyValue(property: string): string; }

const INITIAL: Record<string, readonly string[]> = {
  position: ['static'], 'z-index': ['auto'], overflow: ['visible'], 'flex-direction': ['row'],
  'justify-content': ['normal', 'flex-start'], 'align-items': ['normal', 'stretch'], gap: ['normal', '0px'],
  'grid-template-columns': ['none'], margin: ['0px'], padding: ['0px'],
  top: ['auto'], right: ['auto'], bottom: ['auto'], left: ['auto'], width: ['auto'], height: ['auto'],
  'letter-spacing': ['normal', '0px'], 'text-align': ['start', 'left'], 'line-height': ['normal'], 'font-weight': ['400'],
  'background-color': ['#00000000'], 'background-image': ['none'], 'border-radius': ['0px'], 'box-shadow': ['none'], opacity: ['1'],
};
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const;

export function curatedStyles(cs: StyleSource): GroupedStyles {
  const get = (p: string) => normalize(cs.getPropertyValue(p).trim());
  const out: GroupedStyles = { layout: {}, spacing: {}, typography: {}, visual: {} };
  const put = (group: Record<string, string>, prop: string, value: string) => {
    if (value && !INITIAL[prop]?.includes(value)) group[prop] = value;
  };

  const { layout, spacing, typography, visual } = out;
  const display = get('display');
  const position = get('position');
  put(layout, 'display', display);
  put(layout, 'position', position);
  if (position && position !== 'static') for (const s of SIDES) put(layout, s, get(s));
  put(layout, 'width', get('width'));
  put(layout, 'height', get('height'));
  const isFlex = display.includes('flex');
  const isGrid = display.includes('grid');
  if (isFlex) put(layout, 'flex-direction', get('flex-direction'));
  if (isFlex || isGrid) {
    put(layout, 'justify-content', get('justify-content'));
    put(layout, 'align-items', get('align-items'));
    put(layout, 'gap', get('gap') || get('row-gap'));
  }
  if (isGrid) put(layout, 'grid-template-columns', truncate(get('grid-template-columns'), 120));
  put(layout, 'overflow', get('overflow'));
  put(layout, 'z-index', get('z-index'));

  put(spacing, 'margin', collapse4(SIDES.map(s => get(`margin-${s}`))));
  put(spacing, 'padding', collapse4(SIDES.map(s => get(`padding-${s}`))));

  put(typography, 'font-family', firstFamily(get('font-family')));
  put(typography, 'font-size', get('font-size'));
  put(typography, 'font-weight', get('font-weight'));
  put(typography, 'line-height', get('line-height'));
  put(typography, 'letter-spacing', get('letter-spacing'));
  put(typography, 'text-align', get('text-align'));
  put(typography, 'color', get('color'));

  put(visual, 'background-color', get('background-color'));
  put(visual, 'background-image', truncate(get('background-image'), 120));
  put(visual, 'border', border(get));
  put(visual, 'border-radius', collapse4(CORNERS.map(c => get(`border-${c}-radius`))));
  put(visual, 'box-shadow', get('box-shadow'));
  put(visual, 'opacity', get('opacity'));
  return out;
}

function collapse4([t, r, b, l]: string[]): string {
  if (!t && !r && !b && !l) return '';
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  if (r === l) return `${t} ${r} ${b}`;
  return `${t} ${r} ${b} ${l}`;
}

function border(get: (p: string) => string): string {
  const sides = SIDES.map(s => ({ s, w: get(`border-${s}-width`), style: get(`border-${s}-style`), c: get(`border-${s}-color`) }));
  const visible = sides.filter(x => x.style && x.style !== 'none' && x.style !== 'hidden' && x.w !== '0px');
  if (visible.length === 0) return '';
  const fmt = (x: (typeof sides)[number]) => [x.w, x.style, x.c].filter(Boolean).join(' ');
  if (visible.length === 4 && new Set(visible.map(fmt)).size === 1) return fmt(visible[0]);
  return visible.map(x => `${x.s} ${fmt(x)}`).join(', ');
}

function firstFamily(v: string): string {
  return v.split(',')[0]?.trim().replace(/^["']|["']$/g, '') ?? '';
}

function truncate(v: string, max: number): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function normalize(v: string): string {
  return v
    .replace(/(-?\d*\.\d+)px/g, (_, n: string) => `${Math.round(parseFloat(n) * 10) / 10}px`)
    .replace(/rgba?\(([^)]+)\)/g, (m, inner: string) => rgbToHex(inner) ?? m);
}

function rgbToHex(inner: string): string | null {
  const parts = inner.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.slice(0, 3).some(p => p.endsWith('%'))) return null;
  const [r, g, b] = parts.slice(0, 3).map(p => Math.max(0, Math.min(255, Math.round(parseFloat(p)))));
  if ([r, g, b].some(Number.isNaN)) return null;
  const a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(Math.round(a * 255)) : ''}`;
}
