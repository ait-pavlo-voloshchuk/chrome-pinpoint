import { describe, expect, it } from 'vitest';
import { reactInfoFor } from './react-probe';

type Fiber = { type: unknown; return: Fiber | null };
const named = (name: string) => Object.defineProperty(function () {}, 'name', { value: name });
const chain = (...types: unknown[]): Fiber => {
  let f: Fiber | null = null;
  for (const type of [...types].reverse()) f = { type, return: f };
  return f!;
};
const attach = (el: Element, fiber: Fiber) => { (el as unknown as Record<string, unknown>)['__reactFiber$abc123'] = fiber; };

describe('reactInfoFor', () => {
  it('collects component names nearest first, skipping hosts and wrappers', () => {
    document.body.innerHTML = '<button>Save</button>';
    const btn = document.querySelector('button')!;
    const Provider = { displayName: 'Theme.Provider' };
    attach(btn, chain('button', named('SaveButton'), 'div', { $$typeof: 'fragment', displayName: 'Fragment' }, named('BillingForm'), Provider, named('App')));
    expect(reactInfoFor(btn)).toEqual({ components: ['SaveButton', 'BillingForm', 'App'], minified: false, source: null });
  });

  it('unwraps memo/forwardRef without duplicating names', () => {
    document.body.innerHTML = '<div></div>';
    const div = document.querySelector('div')!;
    const Card = named('Card');
    attach(div, chain('div', Card, { type: Card }, { render: named('Input') }));
    expect(reactInfoFor(div)?.components).toEqual(['Card', 'Input']);
  });

  it('caps at five components and flags minified names', () => {
    document.body.innerHTML = '<i></i>';
    const i = document.querySelector('i')!;
    attach(i, chain('i', named('a'), named('B1'), named('c'), named('D'), named('e'), named('F')));
    expect(reactInfoFor(i)).toEqual({ components: ['a', 'B1', 'c', 'D', 'e'], minified: true, source: null });
  });

  it('reads data-pp-src from the nearest ancestor', () => {
    document.body.innerHTML = '<div data-pp-src="src/App.tsx:10:3"><span>x</span></div>';
    expect(reactInfoFor(document.querySelector('span')!)).toEqual({ components: [], minified: false, source: 'src/App.tsx:10:3' });
  });

  it('falls back to an ancestor fiber for non-React islands', () => {
    document.body.innerHTML = '<div><span>x</span></div>';
    attach(document.querySelector('div')!, chain('div', named('Island')));
    expect(reactInfoFor(document.querySelector('span')!)?.components).toEqual(['Island']);
  });

  it('returns null without fiber or source', () => {
    document.body.innerHTML = '<p>x</p>';
    expect(reactInfoFor(document.querySelector('p')!)).toBeNull();
  });
});
