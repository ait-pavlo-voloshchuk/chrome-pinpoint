export const SCHEMA_VERSION = 1 as const;

export type StyleGroup = 'layout' | 'spacing' | 'typography' | 'visual';
export type GroupedStyles = Record<StyleGroup, Record<string, string>>;

export interface Box { x: number; y: number; width: number; height: number; }
export interface Viewport { width: number; height: number; dpr: number; }

export interface ElementInfo {
  selector: string;
  /** How many elements the selector matches; 1 unless the climb hit max depth. */
  selectorMatches: number;
  domPath: string;
  tag: string;
  text: string | null;
  attributes: Record<string, string>;
  box: Box;
  viewport: Viewport;
  styles: GroupedStyles;
}

export interface ReactInfo {
  /** Component names, nearest first. */
  components: string[];
  minified: boolean;
  /** "path:line:col" from data-pp-src, if present. */
  source: string | null;
}

export interface Screenshot { path: string; clipped: boolean; }

export interface Pin {
  n: number;
  comment: string;
  createdAt: string;
  status: 'attached' | 'detached';
  element: ElementInfo;
  react: ReactInfo | null;
  screenshot: Screenshot | null;
}

export interface PinSession {
  version: typeof SCHEMA_VERSION;
  id: string;
  page: { url: string; title: string };
  pins: Pin[];
  /** Number the next pin will get. Never decreases except when discarding the newest pin. */
  nextN: number;
}

/** "2026-10-05T10-42-13" — safe as a folder name. */
export function sessionId(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/:/g, '-');
}
