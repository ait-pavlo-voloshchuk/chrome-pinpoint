import { describe, expect, it } from 'vitest';
import { curatedStyles, type StyleSource } from './styles';

const src = (m: Record<string, string>): StyleSource => ({ getPropertyValue: p => m[p] ?? '' });
const sides = (prefix: string, v: string) => ({ [`${prefix}-top`]: v, [`${prefix}-right`]: v, [`${prefix}-bottom`]: v, [`${prefix}-left`]: v });

describe('curatedStyles', () => {
  it('omits initial values and collapses shorthands', () => {
    const st = curatedStyles(src({
      display: 'block', position: 'static',
      ...sides('margin', '0px'),
      'padding-top': '8px', 'padding-right': '16px', 'padding-bottom': '8px', 'padding-left': '16px',
      'box-shadow': 'none', opacity: '1', 'background-color': 'rgba(0, 0, 0, 0)',
    }));
    expect(st.layout).toEqual({ display: 'block' });
    expect(st.spacing).toEqual({ padding: '8px 16px' });
    expect(st.visual).toEqual({});
  });

  it('normalizes colors to hex and keeps the first font family', () => {
    const st = curatedStyles(src({
      color: 'rgb(255, 255, 255)', 'background-color': 'rgba(0, 0, 0, 0.5)',
      'font-family': '"Inter", system-ui, sans-serif', 'font-size': '14px', 'font-weight': '500',
    }));
    expect(st.typography).toEqual({ color: '#ffffff', 'font-family': 'Inter', 'font-size': '14px', 'font-weight': '500' });
    expect(st.visual['background-color']).toBe('#00000080');
  });

  it('reports flex properties only for flex containers', () => {
    expect(curatedStyles(src({ display: 'block', 'justify-content': 'center' })).layout['justify-content']).toBeUndefined();
    const flex = curatedStyles(src({ display: 'flex', 'justify-content': 'center', 'align-items': 'center', gap: '8px', 'flex-direction': 'column' })).layout;
    expect(flex).toMatchObject({ display: 'flex', 'justify-content': 'center', 'align-items': 'center', gap: '8px', 'flex-direction': 'column' });
  });

  it('collapses identical borders and drops invisible ones', () => {
    const solid = curatedStyles(src({ ...sides('border', ''), ...Object.fromEntries(['top', 'right', 'bottom', 'left'].flatMap(s => [[`border-${s}-width`, '1px'], [`border-${s}-style`, 'solid'], [`border-${s}-color`, 'rgb(229, 231, 235)']])) }));
    expect(solid.visual.border).toBe('1px solid #e5e7eb');
    const none = curatedStyles(src(Object.fromEntries(['top', 'right', 'bottom', 'left'].flatMap(s => [[`border-${s}-width`, '0px'], [`border-${s}-style`, 'none']]))));
    expect(none.visual.border).toBeUndefined();
  });

  it('rounds fractional pixels and reports offsets only when positioned', () => {
    expect(curatedStyles(src({ width: '128.456px', top: '4px' })).layout).toEqual({ width: '128.5px' });
    expect(curatedStyles(src({ position: 'absolute', top: '4px', left: 'auto' })).layout).toEqual({ position: 'absolute', top: '4px' });
  });
});
