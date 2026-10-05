export const OVERLAY_CSS = `
:host { all: initial; --pp-accent: #d97757; --pp-accent-fg: #ffffff; --pp-bg: #ffffff; --pp-fg: #1f1e1d;
  --pp-muted: #73726c; --pp-border: #e6e3dc; --pp-shadow: 0 8px 24px rgba(0,0,0,.14); }
@media (prefers-color-scheme: dark) {
  :host { --pp-bg: #262624; --pp-fg: #f5f4ef; --pp-muted: #a3a29c; --pp-border: #3d3d3a; --pp-shadow: 0 8px 24px rgba(0,0,0,.5); }
}
* { box-sizing: border-box; }
.pp-layer { position: fixed; inset: 0; pointer-events: none; color: var(--pp-fg);
  font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.pp-hl { position: fixed; display: none; border: 2px solid var(--pp-accent); background: rgba(217,119,87,.12); border-radius: 2px; }
.pp-hl-label { position: fixed; display: none; padding: 2px 6px; border-radius: 4px; background: var(--pp-accent);
  color: var(--pp-accent-fg); font: 600 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre; }
.pp-marker { position: fixed; display: none; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 10px; background: var(--pp-accent); color: var(--pp-accent-fg); font: 700 11px/1 ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 0 0 2px #fff, var(--pp-shadow); transition: transform 80ms ease-out; }
.pp-marker--hot { transform: scale(1.25); }
.pp-bubble { position: fixed; pointer-events: auto; padding: 10px; border-radius: 10px; background: var(--pp-bg);
  border: 1px solid var(--pp-border); box-shadow: var(--pp-shadow); }
.pp-bubble-head { font-weight: 600; margin-bottom: 6px; }
.pp-bubble-input, .pp-row-comment, .pp-tray-fallback { width: 100%; font: inherit; color: inherit; background: transparent;
  border: 1px solid var(--pp-border); border-radius: 6px; padding: 6px 8px; outline: none; }
.pp-bubble-input { resize: vertical; }
.pp-bubble-input:focus, .pp-row-comment:focus { border-color: var(--pp-accent); }
.pp-bubble-hint, .pp-tray-hint { margin-top: 6px; color: var(--pp-muted); font-size: 11px; }
.pp-tray { position: fixed; right: 16px; bottom: 16px; width: 320px; max-height: 60vh; display: none; flex-direction: column;
  pointer-events: auto; background: var(--pp-bg); border: 1px solid var(--pp-border); border-radius: 12px;
  box-shadow: var(--pp-shadow); overflow: hidden; }
.pp-tray-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-weight: 600;
  border-bottom: 1px solid var(--pp-border); }
.pp-tray-list { overflow: auto; padding: 6px; }
.pp-row { display: flex; gap: 8px; align-items: flex-start; padding: 6px; border-radius: 8px; }
.pp-row:hover { background: rgba(217,119,87,.08); }
.pp-row-n { flex: none; width: 20px; height: 20px; border-radius: 10px; background: var(--pp-accent); color: var(--pp-accent-fg);
  font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.pp-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pp-row-comment { resize: none; border-color: transparent; padding: 2px 4px; }
.pp-row-meta { all: unset; cursor: pointer; color: var(--pp-muted); font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-row-detached { align-self: flex-start; font-size: 10px; padding: 0 6px; border-radius: 4px; background: var(--pp-border); color: var(--pp-muted); }
.pp-row-del, .pp-tray-toggle { all: unset; cursor: pointer; color: var(--pp-muted); padding: 0 4px; font-size: 16px; line-height: 20px; }
.pp-tray-prev { all: unset; cursor: pointer; margin: 0 12px 6px; color: var(--pp-accent); font-size: 12px; }
.pp-tray-hint { margin: 6px 12px 0; }
.pp-tray-fallback { margin: 6px 12px 0; width: calc(100% - 24px); height: 80px; resize: none; font: 11px/1.4 ui-monospace, monospace; }
.pp-tray-foot { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--pp-border); }
.pp-btn { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--pp-border); font-weight: 500; }
.pp-btn--primary { background: var(--pp-accent); border-color: var(--pp-accent); color: var(--pp-accent-fg); }
.pp-btn:disabled { opacity: .5; cursor: default; }
.pp-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 8px 14px; border-radius: 8px;
  background: var(--pp-fg); color: var(--pp-bg); box-shadow: var(--pp-shadow); }
`;
