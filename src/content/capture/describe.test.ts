import { describe, expect, it } from 'vitest';
import { describeElement } from './describe';
import { rectInTopViewport } from './geometry';

function fakeRect(el: Element, r: { left: number; top: number; width: number; height: number }): void {
  el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON() {} }) as DOMRect;
}

describe('describeElement', () => {
  it('captures tag, text, whitelisted attributes and box', () => {
    document.body.innerHTML = '<button id="save" class="primary" type="submit" aria-pressed="false" onclick="x()">  Save\n   changes </button>';
    const btn = document.querySelector('button')!;
    fakeRect(btn, { left: 10, top: 20, width: 100.4, height: 40.6 });
    const info = describeElement(btn);
    expect(info.selector).toBe('#save');
    expect(info.selectorMatches).toBe(1);
    expect(info.tag).toBe('button');
    expect(info.text).toBe('Save changes');
    expect(info.attributes).toEqual({ id: 'save', class: 'primary', type: 'submit', 'aria-pressed': 'false' });
    expect(info.box).toEqual({ x: 10, y: 20, width: 100, height: 41 });
    expect(Object.keys(info.styles)).toEqual(['layout', 'spacing', 'typography', 'visual']);
    expect(info.viewport.width).toBe(window.innerWidth);
  });

  it('truncates long text and returns null for empty text', () => {
    document.body.innerHTML = `<p>${'a'.repeat(100)}</p><div></div>`;
    expect(describeElement(document.querySelector('p')!).text).toBe(`${'a'.repeat(79)}…`);
    expect(describeElement(document.querySelector('div')!).text).toBeNull();
  });

  it('truncates long attribute values', () => {
    document.body.innerHTML = `<a href="https://x.test/${'p'.repeat(200)}">x</a>`;
    expect(describeElement(document.querySelector('a')!).attributes.href).toHaveLength(120);
  });
});

describe('rectInTopViewport', () => {
  it('returns the client rect for top-level elements', () => {
    document.body.innerHTML = '<div></div>';
    const div = document.querySelector('div')!;
    fakeRect(div, { left: 5, top: 6, width: 7, height: 8 });
    expect(rectInTopViewport(div)).toEqual({ x: 5, y: 6, width: 7, height: 8 });
  });
});
