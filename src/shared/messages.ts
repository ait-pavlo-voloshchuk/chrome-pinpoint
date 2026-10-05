import type { Box, Screenshot } from './schema';

/** Isolated world → main world, dispatched on the target element (detail: nonce string). */
export const PROBE_EVENT = 'pp:probe';
/** Main world → isolated world, dispatched on window (detail: JSON string { nonce, react }). */
export const PROBE_RESULT_EVENT = 'pp:probe:result';

export type ToContent = { type: 'pp:ping' } | { type: 'pp:toggle' };

export type ScreenshotRequest = {
  type: 'pp:screenshot';
  rect: Box;
  viewport: { width: number; height: number };
  sessionId: string;
  n: number;
};

export type ToBackground =
  | { type: 'pp:whoami' }
  | { type: 'pp:badge'; count: number; active: boolean }
  | ScreenshotRequest;

export type ScreenshotResult =
  | { ok: true; screenshot: Screenshot }
  | { ok: false; error: string };

export const storageKey = (tabId: number): string => `pins:${tabId}`;
