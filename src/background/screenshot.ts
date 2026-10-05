import type { ScreenshotRequest, ScreenshotResult } from '../shared/messages';
import { cropRect } from './crop';

const RETRY_MS = 600;
const DOWNLOAD_TIMEOUT_MS = 10_000;

export async function takeScreenshot(windowId: number, req: ScreenshotRequest): Promise<ScreenshotResult> {
  try {
    const dataUrl = await captureWithRetry(windowId);
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const crop = cropRect(req.rect, req.viewport, bitmap);
    if (!crop) return { ok: false, error: 'Element is outside the viewport' };
    const canvas = new OffscreenCanvas(crop.sw, crop.sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, error: 'No 2D context' };
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
    const png = await canvas.convertToBlob({ type: 'image/png' });
    const path = await saveDownload(await blobToDataUrl(png), `pinpoint/${req.sessionId}/pin-${req.n}.png`);
    return { ok: true, screenshot: { path, clipped: crop.clipped } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function captureWithRetry(windowId: number): Promise<string> {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  } catch {
    // MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND is 2; one retry after a short wait.
    await new Promise(r => setTimeout(r, RETRY_MS));
    return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/png'};base64,${btoa(bin)}`;
}

async function saveDownload(url: string, filename: string): Promise<string> {
  await chrome.downloads.setUiOptions({ enabled: false }).catch(() => {});
  try {
    const id = await chrome.downloads.download({ url, filename, conflictAction: 'overwrite', saveAs: false });
    await waitForComplete(id);
    const [item] = await chrome.downloads.search({ id });
    if (!item?.filename) throw new Error('Download finished without a path');
    return item.filename;
  } finally {
    await chrome.downloads.setUiOptions({ enabled: true }).catch(() => {});
  }
}

function waitForComplete(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener(listener);
    };
    const listener = (d: chrome.downloads.DownloadDelta) => {
      if (d.id !== id) return;
      if (d.state?.current === 'complete') {
        cleanup();
        resolve();
      } else if (d.state?.current === 'interrupted') {
        cleanup();
        reject(new Error(d.error?.current ?? 'Download interrupted'));
      }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Download timed out')); }, DOWNLOAD_TIMEOUT_MS);
    chrome.downloads.onChanged.addListener(listener);
    void chrome.downloads.search({ id }).then(([item]) => {
      if (item?.state === 'complete') { cleanup(); resolve(); }
    });
  });
}
