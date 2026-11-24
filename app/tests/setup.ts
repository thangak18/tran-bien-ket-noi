import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  // Sync Fetch / Abort globals between Node realm and jsdom realm
  const OriginalRequest = globalThis.Request;
  if (OriginalRequest) {
    globalThis.Request = class PatchedRequest extends OriginalRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        if (init && 'signal' in init) {
          const rest = { ...init };
          delete rest.signal;
          super(input, rest);
        } else {
          super(input, init);
        }
      }
    } as unknown as typeof Request;
  }

  window.AbortController = globalThis.AbortController;
  window.AbortSignal = globalThis.AbortSignal;
  window.Request = globalThis.Request;
  window.Response = globalThis.Response;
  window.Headers = globalThis.Headers;
  window.fetch = globalThis.fetch;

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
}
