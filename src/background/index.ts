import { storageKey, type ToBackground, type ToContent } from '../shared/messages';
import { takeScreenshot } from './screenshot';

const TITLE = 'Pinpoint';
const RESTRICTED_TITLE = "Pinpoint can't run on this page";
const ACCENT = '#d97757';
const MUTED = '#6b6b6b';

// Content scripts need chrome.storage.session; pages still cannot read it.
void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

function send(tabId: number, msg: ToContent): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, msg);
}

async function ensureInjected(tabId: number): Promise<void> {
  try {
    await send(tabId, { type: 'pp:ping' });
    return;
  } catch {
    /* not injected in this document yet */
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['probe.js'], world: 'MAIN' });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

export async function activate(tabId: number): Promise<void> {
  try {
    await ensureInjected(tabId);
    await send(tabId, { type: 'pp:toggle' });
    await chrome.action.setTitle({ tabId, title: TITLE });
  } catch {
    await chrome.action.setBadgeText({ tabId, text: '✕' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: MUTED });
    await chrome.action.setTitle({ tabId, title: RESTRICTED_TITLE });
  }
}

async function setBadge(tabId: number, count: number, active: boolean): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : active ? '•' : '' });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: active ? ACCENT : MUTED });
}

chrome.action.onClicked.addListener(tab => {
  if (tab.id !== undefined) void activate(tab.id);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-pin-mode' && tab?.id !== undefined) void activate(tab.id);
});

chrome.tabs.onRemoved.addListener(tabId => {
  void chrome.storage.session.remove(storageKey(tabId));
});

chrome.runtime.onMessage.addListener((msg: ToBackground, sender, sendResponse) => {
  const tab = sender.tab;
  if (tab?.id === undefined) return false;
  switch (msg.type) {
    case 'pp:whoami':
      sendResponse({ tabId: tab.id });
      return false;
    case 'pp:badge':
      void setBadge(tab.id, msg.count, msg.active);
      return false;
    case 'pp:screenshot':
      void takeScreenshot(tab.windowId, msg).then(sendResponse);
      return true; // async response
  }
  return false;
});

if (__E2E__) (globalThis as typeof globalThis & { __ppActivate?: typeof activate }).__ppActivate = activate;
