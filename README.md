# Pinpoint

Pin any element on a web page, comment on it, and copy a precise reference for Claude Code (or any LLM). Pinpoint brings Claude Design's click-to-comment flow to every site.

## Install (unpacked)

```bash
mise install            # Node 22
npm install
npm run build           # → dist/
```

Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/`.

## Use

- Click the toolbar icon or press **Alt+P** to toggle pin mode (rebind at `chrome://extensions/shortcuts`).
- Hover to highlight. Press **↑** for the parent element, **↓** to go back.
- Click to pin, type a comment, then press **Enter**. **Esc** cancels.
- In the tray (bottom-right), use **Copy all** for Markdown or **Copy JSON** for the raw session. Paste it into Claude Code.

Screenshots are saved to `~/Downloads/pinpoint/<session>/pin-N.png` and referenced by absolute path, so Claude Code can open them.

After a full page reload, press Alt+P once to bring Pinpoint back; your pins are restored. Pins are kept for the browser session only.

## Output

```markdown
<!-- pinpoint:v1 -->
## UI pins — Billing · Acme
http://localhost:5173/billing · 1440×900 @2x · 1 pin

### 1. Make this the primary action
- **Element:** `<button> "Save changes"`
- **Selector:** `form.billing-form button.primary`
- **Path:** `main > section.billing > form > div.actions > button.primary`
- **React:** `SaveButton` ← `BillingForm` ← `BillingPage`
- **Source:** `src/pages/billing/BillingForm.tsx:88:9`
- **Box:** 128×40 at (1180, 612)
- **Styles:** font 14px/20px 500 Inter · color #ffffff · bg #6b7280 · padding 8px 16px · radius 6px
- **Screenshot:** /Users/me/Downloads/pinpoint/2026-10-05T10-42-13/pin-1.png
```

`Source` appears only when the app renders `data-pp-src` attributes (a Vite plugin for this is planned for v1.1).

## Development

```bash
npm run dev        # esbuild watch → dist/ (reload the extension after changes)
npm test           # unit tests (Vitest + jsdom)
npm run typecheck
npm run e2e        # Playwright: builds with PP_E2E=1 and runs against a React fixture
```

Under Playwright, downloads are intercepted and renamed to GUIDs, so the e2e test checks that the referenced screenshot file exists rather than its name.

### Manual smoke list

GitHub, a Tailwind site, a CSS-modules app, and albatross-web on localhost. On each one, pin a button and a container, copy, and check that the selector resolves (`document.querySelectorAll(sel).length === 1` in DevTools).

## Limits (v1)

- Elements inside cross-origin iframes can't be pinned individually; you pin the iframe itself.
- React names come from fibers. Production builds with minified names are flagged `(minified names)`.
- `chrome://` pages and the Chrome Web Store are off-limits to extensions.
