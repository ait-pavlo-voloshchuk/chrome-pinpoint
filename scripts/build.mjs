import { build, context } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const e2e = process.env.PP_E2E === '1';
const outdir = 'dist';

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const manifest = JSON.parse(await readFile('src/manifest.json', 'utf8'));
if (e2e) manifest.host_permissions = ['<all_urls>'];
await writeFile(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts',
    probe: 'src/page/react-probe-entry.ts',
  },
  outdir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  sourcemap: watch ? 'inline' : false,
  define: { __E2E__: JSON.stringify(e2e) },
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
