import { afterEach, vi } from "vitest";

type TestResizeTarget = Element;

export class TestResizeObserver {
  static instances = new Set<TestResizeObserver>();
  callback: ResizeObserverCallback;
  observed_targets: Set<TestResizeTarget>;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    this.observed_targets = new Set();
    TestResizeObserver.instances.add(this);
  }

  observe(target: TestResizeTarget) {
    this.observed_targets.add(target);
  }

  unobserve(target: TestResizeTarget) {
    this.observed_targets.delete(target);
  }

  disconnect() {
    this.observed_targets.clear();
  }
}

globalThis.ResizeObserver = TestResizeObserver as never;

export const triggerResizeObservers = (...targets: TestResizeTarget[]) => {
  TestResizeObserver.instances.forEach((observer) => {
    const matched_targets = (targets.length === 0 ? [...observer.observed_targets] : targets).filter((target) =>
      observer.observed_targets.has(target),
    );

    if (matched_targets.length === 0) {
      return;
    }

    observer.callback(
      matched_targets.map((target) => ({ target }) as ResizeObserverEntry),
      observer as never,
    );
  });
};

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  TestResizeObserver.instances.clear();
  vi.restoreAllMocks();
});
