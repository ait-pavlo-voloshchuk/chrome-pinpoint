# Pinpoint — design spec

**Date:** 2026-10-05
**Status:** Draft for review
**Repo:** `chrome-pinpoint`

## 1. Purpose

Pinpoint is a Chrome extension that brings Claude Design's "click an element, leave a note" interaction to any web page. The user pins elements, comments on them, and copies a precise, machine-readable reference into Claude Code (or any LLM chat). The goal is to eliminate ambiguity like "the button on the right, kinda near the header" — every pin carries enough data for an agent to locate the element in the DOM and, when possible, in source code.

**Who:** a developer iterating on UIs with an AI coding agent; secondarily, anyone describing UI feedback on third-party sites.

**Success criteria**
- Pinning an element and pasting the result into Claude Code lets Claude identify the exact element (selector resolves to exactly one node) without follow-up questions.
- Works on arbitrary sites, not only the user's apps.
- On React apps, includes the component chain; on apps with the optional source attribute, includes `file:line`.
- The serialized format is stable JSON underneath, so a future MCP bridge can consume pins directly.

### What the user said vs. assumptions

| Said | Assumed (open to correction) |
|---|---|
| Emulate Claude Design pin/comment behavior | Toolbar click or `Alt+P` toggles pin mode |
| Clipboard first, bridge-ready format | Bridge (local MCP server) is a later, separate spec |
| Not limited to own dev apps | Source mapping is opportunistic, never required |
| Capture scope + UX + architecture approved | Screenshots saved to `~/Downloads/pinpoint/…` and referenced by path |

## 2. Scope

### In scope (v1)
- Pin mode with hover highlight, ancestor walking, click-to-pin, comment bubble.
- Numbered on-page markers and a pin tray (list, edit comment, delete, copy all, clear).
- Per-pin capture: selector, DOM path, tag/text/attributes, box, curated computed styles, cropped screenshot, page URL/title.
- React enrichment: component name + owner chain (from fiber), `data-pp-src` attribute if present.
- Markdown export to clipboard backed by a typed JSON schema.
- Pins persisted per tab for the browser session.

### Out of scope (v1, candidates for later)
- MCP bridge to Claude Code (v2, separate spec).
- `@pinpoint/vite` plugin that injects `data-pp-src` (v1.1). v1 only *reads* the attribute.
- React 19 `_debugStack` source resolution via source maps (v1.1).
- Vue / Svelte / Angular component detection.
- Cross-origin iframe internals (the iframe element itself is pinnable).
- Area/region pins, freehand annotations, multi-element pins.
- Sync across devices, team sharing.

## 3. User experience

### Entering and leaving pin mode
- Toolbar icon click or `Alt+P` (`chrome.commands`, rebindable at `chrome://extensions/shortcuts`) toggles pin mode on the active tab.
- `Esc` exits pin mode (or closes an open comment bubble first).
- While in pin mode the toolbar badge shows the pin count on an accent background.

### Targeting
- Hover draws a highlight box (margin/padding tinted like DevTools) and a label: `button.primary  128×40`.
- `↑` selects the parent of the current target; `↓` returns toward the originally hovered element. This allows precise targeting of wrappers vs. leaves.
- Pointer events on the page are intercepted in the capture phase (`preventDefault` + `stopPropagation`) only while pin mode is on, so clicks do not trigger page actions.

### Pinning
- Click → a numbered marker appears at the element's top-left, and a comment bubble opens anchored to it. `Enter` saves, `Shift+Enter` newline, `Esc` cancels (the pin is discarded if the comment is empty and it was just created).
- Capture runs at click time (before the bubble renders, so the bubble is not in the screenshot).

### Tray
- Collapsible panel, bottom-right, in the overlay shadow root. Lists pins: number, comment (editable inline), short label (`<button> "Save changes"`), component name if known, detached badge if applicable.
- Hovering a tray row highlights its element; clicking scrolls to it.
- Actions: **Copy all** (Markdown to clipboard, toast confirms with pin count), **Copy as JSON** (secondary), **Clear**, per-pin delete.
- The tray stays visible after exiting pin mode until pins are cleared or the user collapses it.

### Restricted pages
- On `chrome://`, the Chrome Web Store, and other pages where injection fails, the badge shows `✕` and the action shows a tooltip "Pinpoint can't run on this page".

## 4. Architecture

Manifest V3, TypeScript, Vite + `@crxjs/vite-plugin`. No UI framework.

```
src/
  manifest.ts             # MV3 manifest (crxjs)
  background/
    index.ts              # service worker: commands, action, injection, messaging
    screenshot.ts         # captureVisibleTab + crop (OffscreenCanvas) + save (downloads)
  content/
    index.ts              # entry: boot overlay, restore pins, wire messages
    overlay/
      root.ts             # shadow host + stylesheet
      highlighter.ts      # hover box + label
      markers.ts          # numbered markers, reposition on scroll/resize/mutation
      bubble.ts           # comment editor
      tray.ts             # pin list + actions
    capture/
      selector.ts         # unique CSS selector builder
      dompath.ts          # short human DOM path
      styles.ts           # curated computed styles
      describe.ts         # tag, text, attributes, box → ElementInfo
    pin-mode.ts           # event interception, ancestor walking, state machine
    store.ts              # per-tab pin persistence (chrome.storage.session)
  page/
    react-probe.ts        # MAIN world: fiber → component chain, data-pp-src
  shared/
    schema.ts             # Pin, PinSession types + version
    markdown.ts           # PinSession → Markdown
    messages.ts           # typed message contracts between worlds/contexts
```

### Units and contracts

| Unit | Responsibility | Depends on | Tested by |
|---|---|---|---|
| `capture/*` | Pure: `Element → ElementInfo`. No chrome APIs. | DOM only | Vitest + jsdom |
| `shared/schema`, `shared/markdown` | Types and serialization. Pure. | — | Vitest (snapshot) |
| `page/react-probe` | Given a marker attribute on an element, return `ReactInfo \| null`. Runs in MAIN world. | page globals | Vitest with fake fiber objects |
| `content/pin-mode` | State machine: `idle → targeting → commenting → idle`. | capture, overlay | Vitest + jsdom |
| `content/overlay/*` | Render only; receives state, emits user intents. | — | Playwright e2e |
| `content/store` | Load/save `PinSession` keyed by tab id. | chrome.storage | Vitest with storage mock |
| `background/*` | Privileged APIs: injection, screenshots, downloads, commands. | chrome APIs | Playwright e2e |

### Permissions

`activeTab`, `scripting`, `storage`, `downloads`. No host permissions: injection is on-demand via `activeTab` when the user clicks the action or presses the shortcut. Consequence: after a full page reload the user re-activates Pinpoint once; pins are then restored from storage. (SPA navigations keep the content script alive.)

### Isolated vs. main world

Content scripts cannot see page JS properties such as `__reactFiber$…`. On activation, the background injects `react-probe.ts` with `chrome.scripting.executeScript({ world: 'MAIN' })`. Protocol:

1. Content script sets `data-pp-probe="<nonce>"` on the target element.
2. Content script posts `{ type: 'pp:probe', nonce }` via `window.postMessage`.
3. Probe finds `[data-pp-probe="<nonce>"]`, reads fiber + `data-pp-src`, replies `{ type: 'pp:probe:result', nonce, react }`.
4. Content script removes the attribute. Timeout 150 ms → `react: null`.

Messages are validated by `type` and nonce; the probe never evaluates data from messages.

### Data flow (one pin)

```
click ─▶ pin-mode ─▶ capture.describe(el)            ─┐
                  ├▶ probe (MAIN world, ≤150 ms)       ├▶ Pin ─▶ store.save ─▶ markers/tray render
                  └▶ bg: screenshot(rect, dpr) → path ─┘
```

Screenshot is requested with the element's viewport rect and `devicePixelRatio`. The background calls `captureVisibleTab` (PNG), crops with `createImageBitmap` + `OffscreenCanvas` (8 px padding, clamped to viewport), and saves via `chrome.downloads.download({ url: dataUrl, filename: 'pinpoint/<sessionId>/pin-<n>.png', conflictAction: 'overwrite', saveAs: false })`. It then reads the absolute path from `chrome.downloads.search({ id })` and returns it. The overlay is hidden (`visibility: hidden` on the shadow host) for the capture frame.

## 5. Capture details

### Selector (`selector.ts`)
Builds the shortest selector that matches exactly one element (`document.querySelectorAll(sel).length === 1`), trying in order:

1. `#id` if the id looks stable (not matching `/\d{4,}|[a-f0-9]{8,}|^:r/`, i.e. not auto-generated / React `useId`).
2. Test hooks: `[data-testid]`, `[data-test]`, `[data-cy]`, `[data-qa]`.
3. `tag[aria-label="…"]`, `tag[name="…"]`, `tag[role="…"]` combined with tag.
4. Tag + stable classes — classes are dropped when they look hashed (`css-[a-z0-9]+`, `sc-`, `_[a-zA-Z0-9]{5,}`, `[a-zA-Z]+_[a-zA-Z0-9]{5}$` CSS-modules suffixes, Tailwind arbitrary values with `[`).
5. Fallback: climb ancestors, prefixing the nearest unique anchor from steps 1–4, using `:nth-of-type()` where needed; max depth 8.

Elements inside open shadow roots produce a chained selector `host-selector >>> inner-selector` (Playwright-style notation, documented in the output). Same-origin iframes prefix `iframe-selector >>>`.

### DOM path (`dompath.ts`)
Human-readable, last 5 levels: `main > section.billing > form > div.actions > button.primary`.

### Element info (`describe.ts`)
- `tag`, `text` (trimmed `innerText`, collapsed whitespace, max 80 chars), `attributes` (id, class, role, aria-*, href, src, alt, type, name, placeholder, data-testid; values max 120 chars).
- `box`: `{ x, y, width, height }` page coordinates, rounded; `viewport: { width, height, dpr }`.

### Curated styles (`styles.ts`)
Read from `getComputedStyle`, grouped. A value is omitted when it equals the property's initial value from a fixed table (e.g. `margin: 0px`, `box-shadow: none`, `opacity: 1`).

- **Layout:** display, position, top/right/bottom/left (if positioned), width, height, flex-direction, justify-content, align-items, gap, grid-template-columns, overflow, z-index
- **Spacing:** margin, padding (shorthand-collapsed)
- **Typography:** font-family (first family only), font-size, font-weight, line-height, letter-spacing, text-align, color
- **Visual:** background-color, background-image (truncated), border (collapsed), border-radius, box-shadow, opacity

Colors are normalized to hex (`#rrggbb` / `#rrggbbaa`).

### React enrichment (`react-probe.ts`)
- Find the fiber via the element's own key starting with `__reactFiber$` (React ≥17), else `__reactInternalInstance$` (≤16).
- Walk `fiber.return`, collecting function/class component names (`type.displayName ?? type.name`), skipping host components, anonymous, and known wrappers (`Fragment`, `Suspense`, `StrictMode`, `*Provider`, `*Context`, `ForwardRef`, `Memo`). Collect up to 5, nearest first.
- `source`: nearest ancestor-or-self `data-pp-src` attribute value (`path:line:col`), else `null`.
- Minified names (length ≤ 2) are kept but flagged `minified: true`.

## 6. Schema (`shared/schema.ts`)

```ts
export const SCHEMA_VERSION = 1;

export interface PinSession {
  version: typeof SCHEMA_VERSION;
  id: string;               // e.g. "2026-10-05T10-42-13"
  page: { url: string; title: string };
  pins: Pin[];
}

export interface Pin {
  n: number;                // 1-based, stable within session
  comment: string;
  createdAt: string;        // ISO
  status: 'attached' | 'detached';
  element: {
    selector: string;
    domPath: string;
    tag: string;
    text: string | null;
    attributes: Record<string, string>;
    box: { x: number; y: number; width: number; height: number };
    viewport: { width: number; height: number; dpr: number };
    styles: Record<'layout' | 'spacing' | 'typography' | 'visual', Record<string, string>>;
  };
  react: {
    components: string[];   // nearest first
    minified: boolean;
    source: string | null;  // "src/pages/Billing.tsx:42:7"
  } | null;
  screenshot: { path: string; clipped: boolean } | null;
}
```

Pins are numbered monotonically; deleting pin 2 does not renumber pin 3 (references in conversation stay valid).

## 7. Markdown export (`shared/markdown.ts`)

```markdown
## UI pins — Billing · Acme
https://localhost:5173/billing · 1440×900 @2x · 2 pins

### 1. Make this the primary action, bump to 16px
- **Element:** `<button> "Save changes"`
- **Selector:** `form.billing-form button[type="submit"]`
- **Path:** `main > section.billing > form > div.actions > button`
- **React:** `SaveButton` ← `BillingForm` ← `BillingPage`
- **Source:** `src/pages/billing/BillingForm.tsx:88:9`
- **Box:** 128×40 at (1180, 612)
- **Styles:** font 14px/20px 500 Inter · color #ffffff · bg #6b7280 · padding 8px 16px · radius 6px
- **Screenshot:** /Users/me/Downloads/pinpoint/2026-10-05T10-42-13/pin-1.png

### 2. …
```

Rules: a line is omitted when its data is null; styles are a single compact line of the non-default values most relevant to visual tweaks (typography, color, background, padding, radius, border, shadow); the full style table is available in JSON. A hidden `<!-- pinpoint:v1 -->` comment heads the block so a future bridge can detect it. A "Copy as JSON" secondary action in the tray copies the raw `PinSession`.

## 8. State and lifecycle

- `chrome.storage.session`, key `pins:<tabId>`, value `PinSession`. Cleared on tab close (`tabs.onRemoved`) and browser exit.
- If the page URL origin+path changes, a new session starts; the tray shows a "Previous page: N pins" link that restores them for copying.
- Markers reposition on `scroll` (passive, rAF-throttled), `resize`, and a `MutationObserver` on `document.body` (debounced 200 ms). If a pin's selector no longer resolves to one element, the pin becomes `detached`: its marker is hidden, the tray shows a badge, and its data still exports.

## 9. Error handling

| Failure | Behavior |
|---|---|
| Injection blocked (restricted page) | Badge `✕`, tooltip, no-op |
| Probe timeout / no React | `react: null`, no user-facing error |
| `captureVisibleTab` fails (rate limit: 2/s) | Retry once after 600 ms; then `screenshot: null`, toast "Screenshot skipped" |
| Downloads denied / disabled | `screenshot: null`, toast once per session |
| Element larger than viewport | Crop to visible intersection, `clipped: true` |
| Selector not unique after max depth | Use best candidate, export with `(matches N)` note |
| Clipboard write fails | Fallback: select a textarea in the tray with the Markdown, toast "Press ⌘C" |

## 10. Testing

- **Unit (Vitest + jsdom):** selector builder (stable ids, hashed classes, nth-of-type fallback, shadow DOM chains, uniqueness), style curation (initial-value filtering, hex normalization), describe (text trimming, attribute whitelist), react-probe against hand-built fake fibers (name walk, wrapper skipping, `data-pp-src` lookup), markdown serializer (snapshot tests for full, minimal, and detached pins), pin-mode state machine.
- **E2E (Playwright, Chromium with unpacked extension):** fixture page with a small React app built in dev mode; scenario: activate → hover → `↑` → click → comment → copy → assert clipboard Markdown contains the expected selector, component chain, and an existing screenshot file.
- **Manual smoke list** in README: GitHub, a Tailwind site, a CSS-modules app, albatross-web.

## 11. Delivery

- `npm run dev` (crxjs HMR), `npm run build` → `dist/` loadable unpacked, `npm test`, `npm run e2e`.
- README with install-unpacked steps, shortcut, output example.
- No Web Store publishing in v1.
- Per the user's standing rule, nothing is committed or pushed without an explicit ask.

## 12. Future (not in v1)

1. **v1.1 — source mapping:** `@pinpoint/vite` (Babel/SWC transform adding `data-pp-src` in dev) and React 19 `_debugStack` + source-map resolution as fallback.
2. **v2 — MCP bridge:** a local MCP server (`pinpoint-mcp`) the extension posts sessions to over `http://127.0.0.1`; tools `list_pins`, `get_pin`, `clear_pins`; Claude Code reads pins without pasting.
