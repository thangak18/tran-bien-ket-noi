import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    const stores = new WeakMap<object, Map<string, string>>();
    const getMap = (instance: object): Map<string, string> => {
      let map = stores.get(instance);
      if (!map) {
        map = new Map<string, string>();
        stores.set(instance, map);
      }
      return map;
    };

    if (typeof Storage !== 'undefined' && Storage.prototype) {
      Storage.prototype.getItem = function (key: string): string | null {
        const map = getMap(this);
        return map.has(String(key)) ? map.get(String(key))! : null;
      };
      Storage.prototype.setItem = function (key: string, value: string): void {
        getMap(this).set(String(key), String(value));
      };
      Storage.prototype.removeItem = function (key: string): void {
        getMap(this).delete(String(key));
      };
      Storage.prototype.clear = function (): void {
        getMap(this).clear();
      };
      Storage.prototype.key = function (index: number): string | null {
        const keys = Array.from(getMap(this).keys());
        return keys[index] ?? null;
      };
      Object.defineProperty(Storage.prototype, 'length', {
        configurable: true,
        get(this: Storage) {
          return getMap(this).size;
        },
      });

      const localInst = Object.create(Storage.prototype) as Storage;
      const sessionInst = Object.create(Storage.prototype) as Storage;

      Object.defineProperty(window, 'localStorage', {
        value: localInst,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'localStorage', {
        value: localInst,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'sessionStorage', {
        value: sessionInst,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: sessionInst,
        configurable: true,
        writable: true,
      });
    }
  }

  window.scrollTo = () => {};
}

// Node 22+ dùng Request của undici, không chấp nhận AbortSignal của jsdom -> React Router data router
// (createMemoryRouter) lỗi khi điều hướng. Bỏ signal khỏi RequestInit trong môi trường test.
if (typeof globalThis.Request === 'function') {
  const NativeRequest = globalThis.Request;
  class TestRequest extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init && 'signal' in init) {
        const rest: RequestInit = { ...init };
        delete rest.signal;
        super(input, rest);
      } else {
        super(input, init);
      }
    }
  }
  globalThis.Request = TestRequest as typeof Request;
}
