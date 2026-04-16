import { afterEach, vi } from "vitest";

class TestResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {}

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver = TestResizeObserver as never;

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
