import { describe, expect, it } from 'vitest';
import { probeReact, sanitizeReactInfo } from './probe-client';
import { installProbe } from '../page/react-probe';
import { PROBE_EVENT, PROBE_RESULT_EVENT } from '../shared/messages';

describe('probeReact', () => {
  it('round-trips through the installed probe', async () => {
    installProbe(window);
    document.body.innerHTML = '<div data-pp-src="src/X.tsx:1:1"><b>x</b></div>';
    const b = document.querySelector('b')!;
    (b as unknown as Record<string, unknown>)['__reactFiber$z'] = { type: 'b', return: { type: Object.defineProperty(function () {}, 'name', { value: 'Xyz' }), return: null } };
    await expect(probeReact(b)).resolves.toEqual({ components: ['Xyz'], minified: false, source: 'src/X.tsx:1:1' });
  });

  it('resolves null on timeout when no probe answers', async () => {
    const lonely = new EventTarget() as unknown as Window;
    const el = document.createElement('div');
    await expect(probeReact(el, 20, lonely)).resolves.toBeNull();
  });

  it('ignores replies with the wrong nonce', async () => {
    const el = document.createElement('div');
    const forge = () => window.dispatchEvent(new CustomEvent(PROBE_RESULT_EVENT, { detail: JSON.stringify({ nonce: 'deadbeefdeadbeef', react: { components: ['Evil'] } }) }));
    el.addEventListener(PROBE_EVENT, forge);
    await expect(probeReact(el, 20)).resolves.toBeNull();
  });
});

describe('sanitizeReactInfo', () => {
  it('drops malformed fields from a forged payload', () => {
    expect(sanitizeReactInfo({ components: ['Ok', 42, { x: 1 }, 'L'.repeat(200)], minified: 'yes', source: 7 }))
      .toEqual({ components: ['Ok', 'L'.repeat(80)], minified: false, source: null });
    expect(sanitizeReactInfo('nope')).toBeNull();
    expect(sanitizeReactInfo(null)).toBeNull();
  });
});
