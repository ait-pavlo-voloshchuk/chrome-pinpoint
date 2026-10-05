import type { GroupedStyles, Pin, PinSession } from './schema';

export const MARKER = '<!-- pinpoint:v1 -->';

export function toMarkdown(s: PinSession): string {
  const lines: string[] = [MARKER, `## UI pins — ${oneLine(s.page.title) || s.page.url}`];
  const meta = [s.page.url];
  const vp = s.pins[0]?.element.viewport;
  if (vp) meta.push(`${vp.width}×${vp.height} @${fmt(vp.dpr)}x`);
  meta.push(`${s.pins.length} ${s.pins.length === 1 ? 'pin' : 'pins'}`);
  lines.push(meta.join(' · '));
  for (const pin of s.pins) lines.push('', ...pinLines(pin));
  return lines.join('\n') + '\n';
}

export function toJson(s: PinSession): string {
  return JSON.stringify(s, null, 2);
}

export function compactStyles(st: GroupedStyles): string {
  const t = st.typography;
  const v = st.visual;
  const parts: string[] = [];
  const size = t['font-size'] ? t['font-size'] + (t['line-height'] ? `/${t['line-height']}` : '') : '';
  const font = [size, t['font-weight'], t['font-family']].filter(Boolean).join(' ');
  if (font) parts.push(`font ${font}`);
  if (t.color) parts.push(`color ${t.color}`);
  if (v['background-color']) parts.push(`bg ${v['background-color']}`);
  if (st.spacing.padding) parts.push(`padding ${st.spacing.padding}`);
  if (v['border-radius']) parts.push(`radius ${v['border-radius']}`);
  if (v.border) parts.push(`border ${v.border}`);
  if (v['box-shadow']) parts.push(`shadow ${v['box-shadow']}`);
  return parts.join(' · ');
}

function pinLines(p: Pin): string[] {
  const [first, ...rest] = (p.comment.trim() || '(no comment)').split('\n');
  const out = [`### ${p.n}. ${first}`];
  for (const line of rest) out.push(`> ${line}`);

  const e = p.element;
  const text = e.text ? ` "${e.text.replace(/`/g, "'")}"` : '';
  out.push(`- **Element:** ${code(`<${e.tag}>${text}`)}`);
  out.push(`- **Selector:** ${code(e.selector)}${e.selectorMatches > 1 ? ` (matches ${e.selectorMatches})` : ''}`);
  if (p.status === 'detached') out.push('- **Status:** detached (element no longer found on page)');
  out.push(`- **Path:** ${code(e.domPath)}`);
  if (p.react && p.react.components.length > 0) {
    const chain = p.react.components.map(code).join(' ← ');
    out.push(`- **React:** ${chain}${p.react.minified ? ' (minified names)' : ''}`);
  }
  if (p.react?.source) out.push(`- **Source:** ${code(p.react.source)}`);
  out.push(`- **Box:** ${e.box.width}×${e.box.height} at (${e.box.x}, ${e.box.y})`);
  const styles = compactStyles(e.styles);
  if (styles) out.push(`- **Styles:** ${styles}`);
  if (p.screenshot) out.push(`- **Screenshot:** ${oneLine(p.screenshot.path)}${p.screenshot.clipped ? ' (clipped to viewport)' : ''}`);
  return out;
}

/** Collapses control characters and newlines so page data cannot start new Markdown lines. */
function oneLine(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** Inline code span that survives backticks in the value (CommonMark: fence longer than any run inside). */
function code(v: string): string {
  const value = oneLine(v);
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map(r => r.length));
  const fence = '`'.repeat(longest + 1);
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${value}${pad}${fence}`;
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}
