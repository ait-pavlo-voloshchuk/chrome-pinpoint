import { describe, expect, it } from 'vitest';
import { domPath, elementLabel } from './dompath';

describe('domPath', () => {
  it('lists the last five levels with a stable class or id', () => {
    document.body.innerHTML = '<div id="root"><main><section class="billing css-1x2y3z"><form><div class="actions"><button class="primary">Save</button></div></form></section></main></div>';
    const btn = document.querySelector('button')!;
    expect(domPath(btn)).toBe('main > section.billing > form > div.actions > button.primary');
    expect(elementLabel(document.getElementById('root')!)).toBe('div#root');
  });

  it('stops at body', () => {
    document.body.innerHTML = '<p><span>x</span></p>';
    expect(domPath(document.querySelector('span')!)).toBe('p > span');
  });
});
