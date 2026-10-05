import { chromium, expect, test, type BrowserContext } from '@playwright/test';
import { build } from 'esbuild';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const DIST = path.resolve('dist');
const FIXTURE = path.resolve('e2e/fixture');

let server: http.Server;
let baseUrl: string;
let context: BrowserContext;

test.beforeAll(async () => {
  await build({
    entryPoints: [path.join(FIXTURE, 'app.tsx')],
    outfile: path.join(FIXTURE, 'dist/app.js'),
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  server = http.createServer((req, res) => {
    const file = !req.url || req.url === '/' ? 'index.html' : req.url.slice(1);
    const full = path.join(FIXTURE, file);
    if (!full.startsWith(FIXTURE) || !existsSync(full)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html' }).end(readFileSync(full));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  context = await chromium.launchPersistentContext(mkdtempSync(path.join(os.tmpdir(), 'pp-e2e-')), {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 },
  });
});

test.afterAll(async () => {
  await context?.close();
  server?.close();
});

test('pins an element and copies a precise reference', async () => {
  const page = await context.newPage();
  await page.goto(baseUrl);
  const save = page.getByRole('button', { name: 'Save changes' });
  await save.waitFor();

  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async url => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find(t => t.url?.startsWith(url));
    if (!tab?.id) throw new Error('fixture tab not found');
    await (globalThis as unknown as { __ppActivate(id: number): Promise<void> }).__ppActivate(tab.id);
  }, baseUrl);

  const box = (await save.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const label = page.locator('pinpoint-overlay .pp-hl-label');

  await page.mouse.move(cx, cy);
  await expect(label).toContainText('button.primary');
  await page.keyboard.press('ArrowUp');
  await expect(label).toContainText('div.actions');
  await page.keyboard.press('ArrowDown');
  await expect(label).toContainText('button.primary');

  await page.mouse.click(cx, cy);
  const input = page.locator('pinpoint-overlay .pp-bubble-input');
  await input.fill('Make it the primary action');
  await input.press('Enter');

  await expect(page.locator('#status')).toHaveText('idle'); // page click was swallowed

  await page.locator('pinpoint-overlay .pp-tray-copy').click();
  const md = await page.evaluate(() => navigator.clipboard.readText());

  expect(md.startsWith('<!-- pinpoint:v1 -->')).toBe(true);
  expect(md).toContain('### 1. Make it the primary action');
  expect(md).toContain('- **Selector:** `button.primary`');
  expect(md).toContain('- **Path:** `main > section.billing > form.billing-form > div.actions > button.primary`');
  expect(md).toContain('- **React:** `SaveButton` ← `Actions` ← `BillingForm` ← `App`');
  expect(md).toContain('- **Source:** `src/BillingForm.tsx:12:5`');

  // Playwright renames intercepted downloads to GUIDs, so match any path, not just *.png.
  const shot = md.match(/\*\*Screenshot:\*\* (\S+)$/m);
  expect(shot, 'markdown should reference a screenshot').not.toBeNull();
  expect(existsSync(shot![1])).toBe(true);
});
