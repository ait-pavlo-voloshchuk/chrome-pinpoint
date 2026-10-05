import { beforeEach, describe, expect, it } from 'vitest';
import { buildSelector } from './selector';
import { resolveSelector } from './resolve';
import { cssEscape, isStableId, stableClasses } from './stability';

function mount(html: string): void {
  document.body.innerHTML = html;
}
function expectUnique(el: Element, selector: string): void {
  const found = document.querySelectorAll(selector);
  expect(found.length).toBe(1);
  expect(found[0]).toBe(el);
}

beforeEach(() => mount(''));

describe('stability', () => {
  it('detects generated ids', () => {
    expect(isStableId('save')).toBe(true);
    expect(isStableId(':r1:')).toBe(false);
    expect(isStableId('«r3»')).toBe(false);
    expect(isStableId('el-12345')).toBe(false);
    expect(isStableId('a1b2c3d4e5')).toBe(false);
    expect(isStableId('radix-:r2:')).toBe(false);
  });

  it('drops hashed and variant classes', () => {
    mount('<div class="css-1a2b3c sc-AxjAm _3xYz9 Button__a1B2c _primary_k3j2h_1 jsx-123 hover:bg-blue-500 w-[10px] card"></div>');
    expect(stableClasses(document.querySelector('div')!)).toEqual(['card']);
  });

  it('escapes CSS identifiers', () => {
    expect(cssEscape('user.name')).toBe('user\\.name');
    expect(cssEscape('1abc')).toBe('\\31 abc');
    expect(cssEscape('a:b')).toBe('a\\:b');
  });
});

describe('buildSelector', () => {
  it('prefers a stable id', () => {
    mount('<div><button id="save">Save</button></div>');
    expect(buildSelector(document.getElementById('save')!)).toEqual({ selector: '#save', matches: 1 });
  });

  it('escapes ids with special characters', () => {
    mount('<input id="user.name">');
    const el = document.querySelector('input')!;
    const { selector } = buildSelector(el);
    expect(selector).toBe('#user\\.name');
    expectUnique(el, selector);
  });

  it('skips generated ids', () => {
    mount('<button id=":r1:" class="primary">A</button><button>B</button>');
    expect(buildSelector(document.querySelector('.primary')!).selector).toBe('button.primary');
  });

  it('uses test hooks', () => {
    mount('<div data-testid="card"></div><div></div>');
    expect(buildSelector(document.querySelector('[data-testid]')!).selector).toBe('[data-testid="card"]');
  });

  it('uses aria-label combined with the tag', () => {
    mount('<button aria-label="Close">×</button><button>Ok</button>');
    expect(buildSelector(document.querySelector('[aria-label]')!).selector).toBe('button[aria-label="Close"]');
  });

  it('ignores hashed and Tailwind variant classes', () => {
    mount('<div class="css-1a2b3c card"></div><div class="css-9z8y7x"></div><button class="hover:bg-blue-500 btn"></button><button class="hover:bg-blue-500"></button>');
    expect(buildSelector(document.querySelector('.card')!).selector).toBe('div.card');
    expect(buildSelector(document.querySelector('.btn')!).selector).toBe('button.btn');
  });

  it('falls back to nth-of-type under a unique anchor', () => {
    mount('<ul id="list"><li>a</li><li>b</li><li>c</li></ul>');
    const li = document.querySelectorAll('li')[1];
    const { selector, matches } = buildSelector(li);
    expect(selector).toBe('#list > li:nth-of-type(2)');
    expect(matches).toBe(1);
    expectUnique(li, selector);
  });

  it('climbs until something is unique', () => {
    mount('<section><p>a</p></section><section><p>b</p></section>');
    const p = document.querySelectorAll('p')[1];
    const { selector } = buildSelector(p);
    expect(selector).toBe('body > section:nth-of-type(2) > p');
    expectUnique(p, selector);
  });

  it('chains through open shadow roots', () => {
    mount('<x-card id="host"></x-card>');
    const host = document.getElementById('host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button class="go">Go</button><button>Other</button>';
    const btn = shadow.querySelector('.go')!;
    const { selector } = buildSelector(btn);
    expect(selector).toBe('#host >>> button.go');
    expect(resolveSelector(selector)).toBe(btn);
  });
});

describe('resolveSelector', () => {
  it('resolves plain selectors and returns null when missing or invalid', () => {
    mount('<p class="x">a</p>');
    expect(resolveSelector('p.x')).toBe(document.querySelector('p'));
    expect(resolveSelector('p.missing')).toBeNull();
    expect(resolveSelector('p[')).toBeNull();
  });
});
