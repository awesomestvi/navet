import { vi } from 'vitest';

type MediaQueryChangeListener = (event: MediaQueryListEvent) => void;

function toMediaQueryListener(
  listener: EventListenerOrEventListenerObject
): MediaQueryChangeListener {
  if (typeof listener === 'function') {
    return (event) => listener.call(window, event);
  }

  return (event) => listener.handleEvent(event);
}

class MockMediaQueryList implements MediaQueryList {
  media: string;
  matches: boolean;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;
  private listeners = new Set<MediaQueryChangeListener>();

  constructor(media: string, matches = false) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) return;
    this.listeners.add(toMediaQueryListener(listener));
  }

  removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) return;
    this.listeners.delete(toMediaQueryListener(listener));
  }

  addListener(listener: MediaQueryChangeListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: MediaQueryChangeListener) {
    this.listeners.delete(listener);
  }

  dispatchEvent(event: Event) {
    const mediaEvent = event as MediaQueryListEvent;
    this.onchange?.call(this as MediaQueryList, mediaEvent);
    this.listeners.forEach((listener) => {
      listener(mediaEvent);
    });
    return true;
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;
    this.dispatchEvent(event as Event);
  }
}

type ViewportListener = () => void;

const mediaQueries = new Map<string, MockMediaQueryList>();
const viewportListeners = new Set<ViewportListener>();

const visualViewport = {
  width: 1024,
  height: 768,
  addEventListener: vi.fn((_type: string, listener: ViewportListener) => {
    viewportListeners.add(listener);
  }),
  removeEventListener: vi.fn((_type: string, listener: ViewportListener) => {
    viewportListeners.delete(listener);
  }),
};

function getMediaQueryList(query: string) {
  let entry = mediaQueries.get(query);
  if (!entry) {
    entry = new MockMediaQueryList(query);
    mediaQueries.set(query, entry);
  }
  return entry;
}

export function setMediaQueryMatch(query: string, matches: boolean) {
  getMediaQueryList(query).setMatches(matches);
}

export function setVisualViewportSize(width: number, height: number) {
  visualViewport.width = width;
  visualViewport.height = height;
}

export function emitVisualViewportResize() {
  viewportListeners.forEach((listener) => {
    listener();
  });
}

export function installBrowserMocks() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => getMediaQueryList(query)),
  });

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  if (!window.requestAnimationFrame) {
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 16),
    });
  }

  if (!window.cancelAnimationFrame) {
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: (handle: number) => window.clearTimeout(handle),
    });
  }

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: visualViewport,
  });

  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: vi.fn().mockResolvedValue([]),
    },
  });

  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class MockIntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

export function resetBrowserMocks() {
  mediaQueries.clear();
  viewportListeners.clear();
  setVisualViewportSize(1024, 768);
  localStorage.clear();
  sessionStorage.clear();
  window.__NAVET_CONFIG__ = undefined;
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('style');
}
