import { Controller } from './controller';
import { createStore } from './store';
import { storageKey, type ToContent } from '../shared/messages';

type PinpointGlobal = typeof globalThis & { __pinpoint?: Promise<Controller> };
const g = globalThis as PinpointGlobal;

if (!g.__pinpoint) {
  // Register synchronously so the background's toggle right after injection is not lost.
  g.__pinpoint = (async () => {
    const { tabId } = (await chrome.runtime.sendMessage({ type: 'pp:whoami' })) as { tabId: number };
    const area = {
      get: (key: string) => chrome.storage.session.get(key),
      set: (items: Record<string, unknown>) => chrome.storage.session.set(items),
    };
    const controller = new Controller(createStore(area, storageKey(tabId)));
    await controller.boot();
    return controller;
  })();

  const ready = g.__pinpoint;
  chrome.runtime.onMessage.addListener((msg: ToContent, _sender, sendResponse) => {
    if (msg.type === 'pp:ping') {
      sendResponse(true);
    } else if (msg.type === 'pp:toggle') {
      void ready.then(c => c.toggle());
      sendResponse(true);
    }
    return false;
  });
}
