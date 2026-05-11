import { Buffer } from 'buffer';
import process from 'process';

// Custom polyfills or environment checks
if (typeof window !== 'undefined') {
  // Ensure Buffer exists
  (window as any).Buffer = Buffer;
  // Ensure process exists
  (window as any).process = process;

  // Defensive fix for "Cannot set property fetch of #<Window> which has only a getter"
  // This happens when libraries (like cross-fetch) try to polyfill fetch
  // but window.fetch is read-only. We can't make it writable safely in all envs,
  // but we can try to define a setter that ignores assignments.
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      Object.defineProperty(window, 'fetch', {
        get: () => originalFetch,
        set: () => { /* ignore attempts to overwrite */ },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    // Some environments might not allow redefining fetch even if it's configurable
  }

  // Define global as a proxy-like object that inherits from window.
  // This allows libraries (like cross-fetch) to do global.fetch = ...
  // without triggering the same error if they use global instead of window/globalThis directly.
  if (!(window as any).global) {
    try {
      const _global = Object.create(window);
      _global.global = _global;
      _global.Buffer = Buffer;
      _global.process = process;
      
      (window as any).global = _global;
    } catch (e) {
      (window as any).global = window;
    }
  }
}

export {};


