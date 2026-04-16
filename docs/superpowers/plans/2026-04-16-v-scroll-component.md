# v-scroll Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production `v-scroll` Web Component with real scrolling, custom scrollbar visuals, resize-driven visibility, pointer-captured thumb dragging, and lifecycle cleanup, while preserving the existing Vite theme pipeline.

**Architecture:** Keep the component centered in `src/elements/v-scroll.ts`, but extract the scroll math into a pure helper module so the hardest PDF requirement can be verified with deterministic tests. Drive all DOM updates through one layout sync path that reads `viewport` geometry and writes `track` / `thumb` state, then layer pointer dragging and cleanup on top of that shared path.

**Tech Stack:** bun, TypeScript, Vite, Vitest, happy-dom, native Web Components, Shadow DOM, ResizeObserver, Pointer Events, lightningcss

---

## File Map

- Create: `docs/superpowers/plans/2026-04-16-v-scroll-component.md`
- Create: `src/elements/v-scroll-math.ts`
- Modify: `src/elements/v-scroll.ts`
- Modify: `src/main.ts`
- Modify: `themes/default/v-scroll.css`
- Modify: `tests/setup.ts`
- Modify: `tests/v-scroll.test.ts`
- Create: `tests/v-scroll-math.test.ts`
- Reuse: `src/assets/grab.svg`
- Keep available: `src/assets/scroll.svg`

## Notes Before Execution

- `src/theme-imports/v-scroll.js` is generated. Do not edit it by hand.
- Keep `Shadow DOM` as the structural boundary. Do not switch to light DOM wrappers.
- The source of truth for scrolling is always `viewport.scrollTop`.
- Drag mapping must include the PDF-mandated top and bottom gap in the formula.
- Do not add public methods such as `refresh()` or `scrollTo()`.

### Task 1: Extract and verify pure scrollbar math

**Files:**

- Create: `src/elements/v-scroll-math.ts`
- Create: `tests/v-scroll-math.test.ts`

- [ ] **Step 1: Write the failing math tests**

```ts
import { describe, expect, it } from "vitest";
import {
  MIN_THUMB_SIZE,
  TRACK_BOTTOM_GAP,
  TRACK_TOP_GAP,
  getScrollTopFromThumbOffset,
  getThumbOffset,
  getThumbSize,
} from "../src/elements/v-scroll-math";

describe("v-scroll math", () => {
  it("returns zero thumb size when content does not overflow", () => {
    expect(
      getThumbSize({ track_size: 200, client_size: 200, scroll_size: 200 }),
    ).toBe(0);
  });

  it("uses the visible ratio and minimum size for thumb height", () => {
    expect(
      getThumbSize({ track_size: 200, client_size: 100, scroll_size: 1000 }),
    ).toBe(19);
    expect(
      getThumbSize({ track_size: 200, client_size: 300, scroll_size: 600 }),
    ).toBe(97);
  });

  it("maps scrollTop into the effective track range", () => {
    const thumb_size = 40;

    expect(
      getThumbOffset({
        track_size: 200,
        thumb_size,
        client_size: 300,
        scroll_size: 900,
        scroll_top: 300,
      }),
    ).toBe(77);
  });

  it("maps thumb offset back to scrollTop with track gaps applied", () => {
    expect(
      getScrollTopFromThumbOffset({
        track_size: 200,
        thumb_size: 40,
        client_size: 300,
        scroll_size: 900,
        thumb_offset: 154,
      }),
    ).toBe(600);
  });

  it("exposes the PDF gap constants", () => {
    expect(TRACK_TOP_GAP).toBe(3);
    expect(TRACK_BOTTOM_GAP).toBe(3);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `bun run test tests/v-scroll-math.test.ts`  
Expected: FAIL with `Cannot find module '../src/elements/v-scroll-math'`

- [ ] **Step 3: Write the pure math module**

```ts
export const TRACK_TOP_GAP = 3,
  TRACK_BOTTOM_GAP = 3,
  MIN_THUMB_SIZE = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getUsableTrackSize = (track_size: number) =>
  Math.max(0, track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP);

const getMaxScrollTop = (client_size: number, scroll_size: number) =>
  Math.max(0, scroll_size - client_size);

export const getThumbSize = ({
  track_size,
  client_size,
  scroll_size,
}: {
  track_size: number;
  client_size: number;
  scroll_size: number;
}) => {
  if (scroll_size <= client_size || track_size <= 0) {
    return 0;
  }

  const usable_track = getUsableTrackSize(track_size),
    raw_size = Math.floor((client_size / scroll_size) * usable_track);

  return Math.min(usable_track, Math.max(MIN_THUMB_SIZE, raw_size));
};

export const getThumbOffset = ({
  track_size,
  thumb_size,
  client_size,
  scroll_size,
  scroll_top,
}: {
  track_size: number;
  thumb_size: number;
  client_size: number;
  scroll_size: number;
  scroll_top: number;
}) => {
  const max_scroll_top = getMaxScrollTop(client_size, scroll_size),
    effective_track = Math.max(
      0,
      track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumb_size,
    );

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((scroll_top / max_scroll_top) * effective_track);
};

export const getScrollTopFromThumbOffset = ({
  track_size,
  thumb_size,
  client_size,
  scroll_size,
  thumb_offset,
}: {
  track_size: number;
  thumb_size: number;
  client_size: number;
  scroll_size: number;
  thumb_offset: number;
}) => {
  const max_scroll_top = getMaxScrollTop(client_size, scroll_size),
    effective_track = Math.max(
      0,
      track_size - TRACK_TOP_GAP - TRACK_BOTTOM_GAP - thumb_size,
    ),
    safe_offset = clamp(thumb_offset, 0, effective_track);

  if (max_scroll_top === 0 || effective_track === 0) {
    return 0;
  }

  return Math.round((safe_offset / effective_track) * max_scroll_top);
};
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `bun run test tests/v-scroll-math.test.ts`  
Expected: PASS with `5 passed`

- [ ] **Step 5: Commit the math layer**

```bash
git add src/elements/v-scroll-math.ts tests/v-scroll-math.test.ts
git commit -m "test: add v-scroll scroll math"
```

### Task 2: Rebuild the shadow DOM shell and state hooks

**Files:**

- Modify: `src/elements/v-scroll.ts`
- Modify: `tests/v-scroll.test.ts`

- [ ] **Step 1: Replace the structure test with the real shell requirements**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { registerVScroll } from "../src/elements/v-scroll";

describe("registerVScroll", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("registers the custom element once", () => {
    registerVScroll();
    registerVScroll();

    expect(customElements.get("v-scroll")).toBeDefined();
  });

  it("creates viewport, track, thumb, and grab parts inside shadow dom", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    host.innerHTML = "<article><p>Demo content</p></article>";
    document.body.append(host);

    const frame = host.shadowRoot?.querySelector('[data_v_scroll_frame="yes"]'),
      viewport = host.shadowRoot?.querySelector(
        '[data_v_scroll_viewport="yes"]',
      ),
      slot = host.shadowRoot?.querySelector("slot"),
      track = host.shadowRoot?.querySelector('[data_v_scroll_track="yes"]'),
      thumb = host.shadowRoot?.querySelector('[data_v_scroll_thumb="yes"]'),
      grab = host.shadowRoot?.querySelector('[data_v_scroll_grab="yes"]');

    expect(frame?.getAttribute("part")).toBe("frame");
    expect(viewport?.getAttribute("part")).toBe("viewport");
    expect(slot).toBeDefined();
    expect(track?.getAttribute("part")).toBe("track");
    expect(track?.getAttribute("aria-hidden")).toBe("true");
    expect(thumb?.getAttribute("part")).toBe("thumb");
    expect(grab?.getAttribute("part")).toBe("grab");
    expect(grab?.tagName).toBe("IMG");
    expect(host.querySelector("p")?.textContent).toBe("Demo content");
  });

  it("does not duplicate the shell when connected twice", () => {
    registerVScroll();

    const host = document.createElement("v-scroll");
    document.body.append(host);
    host.remove();
    document.body.append(host);

    expect(
      host.shadowRoot?.querySelectorAll('[data_v_scroll_frame="yes"]').length,
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: FAIL because `viewport` and `grab` do not exist

- [ ] **Step 3: Replace `src/elements/v-scroll.ts` with the real shell builder**

```ts
import grab_icon from "../assets/grab.svg";

const ELEMENT_NAME = "v-scroll",
  FRAME_ATTR = "data_v_scroll_frame",
  VIEWPORT_ATTR = "data_v_scroll_viewport",
  TRACK_ATTR = "data_v_scroll_track",
  THUMB_ATTR = "data_v_scroll_thumb",
  GRAB_ATTR = "data_v_scroll_grab";

type VScrollParts = {
  frame: HTMLDivElement;
  viewport: HTMLDivElement;
  slot: HTMLSlotElement;
  track: HTMLDivElement;
  thumb: HTMLDivElement;
  grab: HTMLImageElement;
};

const createParts = () => {
  const frame = document.createElement("div"),
    viewport = document.createElement("div"),
    slot = document.createElement("slot"),
    track = document.createElement("div"),
    thumb = document.createElement("div"),
    grab = document.createElement("img");

  frame.setAttribute("part", "frame");
  frame.setAttribute(FRAME_ATTR, "yes");

  viewport.setAttribute("part", "viewport");
  viewport.setAttribute(VIEWPORT_ATTR, "yes");

  track.setAttribute("part", "track");
  track.setAttribute(TRACK_ATTR, "yes");
  track.setAttribute("aria-hidden", "true");

  thumb.setAttribute("part", "thumb");
  thumb.setAttribute(THUMB_ATTR, "yes");

  grab.setAttribute("part", "grab");
  grab.setAttribute(GRAB_ATTR, "yes");
  grab.alt = "";
  grab.draggable = false;
  grab.src = grab_icon;

  viewport.append(slot);
  thumb.append(grab);
  track.append(thumb);
  frame.append(viewport, track);

  return { frame, viewport, slot, track, thumb, grab };
};

class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;
  parts: VScrollParts | null;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
  }

  connectedCallback() {
    if (!this.parts) {
      this.parts = createParts();
      this.shadow_root.append(this.parts.frame);
    }
  }
}

export const registerVScroll = () => {
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, VScrollElement);
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: PASS with `3 passed`

- [ ] **Step 5: Commit the shell upgrade**

```bash
git add src/elements/v-scroll.ts tests/v-scroll.test.ts
git commit -m "feat: add v-scroll shadow shell"
```

### Task 3: Implement scroll sync, resize-driven visibility, and disconnect cleanup

**Files:**

- Modify: `src/elements/v-scroll.ts`
- Modify: `tests/setup.ts`
- Modify: `tests/v-scroll.test.ts`

- [ ] **Step 1: Add failing behavior tests for overflow, sizing, and cleanup**

```ts
it("hides the track when content does not overflow", () => {
  registerVScroll();

  const host = document.createElement("v-scroll");
  document.body.append(host);

  const viewport = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_viewport="yes"]',
    ),
    track = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_track="yes"]',
    );

  Object.defineProperties(viewport!, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 300 },
  });

  viewport!.dispatchEvent(new Event("scroll"));

  expect(host.dataset.scrollable).toBe("no");
  expect(track?.dataset.visible).toBe("no");
});

it("sizes and positions the thumb from viewport geometry", () => {
  registerVScroll();

  const host = document.createElement("v-scroll");
  document.body.append(host);

  const viewport = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_viewport="yes"]',
    ),
    track = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_track="yes"]',
    ),
    thumb = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_thumb="yes"]',
    );

  Object.defineProperties(viewport!, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 900 },
    scrollTop: { configurable: true, value: 300, writable: true },
  });

  Object.defineProperty(track!, "clientHeight", {
    configurable: true,
    value: 180,
  });

  viewport!.dispatchEvent(new Event("scroll"));

  expect(host.dataset.scrollable).toBe("yes");
  expect(track?.dataset.visible).toBe("yes");
  expect(thumb?.style.blockSize).toBe("58px");
  expect(thumb?.style.transform).toBe("translateY(58px)");
});

it("disconnects resize observers when the element leaves the document", () => {
  registerVScroll();

  const disconnect_spy = vi.spyOn(
    globalThis.ResizeObserver.prototype,
    "disconnect",
  );
  const host = document.createElement("v-scroll");

  document.body.append(host);
  host.remove();

  expect(disconnect_spy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: FAIL because visibility flags, thumb styles, and cleanup are not implemented

- [ ] **Step 3: Add a test-friendly ResizeObserver shim to `tests/setup.ts`**

```ts
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
```

- [ ] **Step 4: Add layout sync, resize wiring, and cleanup to `src/elements/v-scroll.ts`**

```ts
class VScrollElement extends HTMLElement {
  shadow_root: ShadowRoot;
  parts: VScrollParts | null;
  resize_observer: ResizeObserver | null;
  raf_id: number | null;
  observed_nodes: Set<Element>;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
    this.resize_observer = null;
    this.raf_id = null;
    this.observed_nodes = new Set();
  }

  ensureParts() {
    if (!this.parts) {
      this.parts = createParts();
      this.shadow_root.append(this.parts.frame);
    }

    return this.parts;
  }

  syncLayout = () => {
    const { viewport, track, thumb } = this.ensureParts(),
      track_size = track.clientHeight,
      client_size = viewport.clientHeight,
      scroll_size = viewport.scrollHeight,
      scroll_top = viewport.scrollTop,
      thumb_size = getThumbSize({ track_size, client_size, scroll_size }),
      thumb_offset = getThumbOffset({
        track_size,
        thumb_size,
        client_size,
        scroll_size,
        scroll_top,
      });

    if (thumb_size === 0) {
      this.dataset.scrollable = "no";
      track.dataset.visible = "no";
      thumb.style.blockSize = "";
      thumb.style.transform = "";
      return;
    }

    this.dataset.scrollable = "yes";
    track.dataset.visible = "yes";
    thumb.style.blockSize = `${thumb_size}px`;
    thumb.style.transform = `translateY(${thumb_offset}px)`;
  };

  syncObservedContent = () => {
    const { slot } = this.ensureParts();

    this.observed_nodes.forEach((node) =>
      this.resize_observer?.unobserve(node),
    );
    this.observed_nodes.clear();

    slot.assignedElements().forEach((node) => {
      this.resize_observer?.observe(node);
      this.observed_nodes.add(node);
    });
  };

  scheduleSync = () => {
    if (this.raf_id !== null) {
      cancelAnimationFrame(this.raf_id);
    }

    this.raf_id = requestAnimationFrame(() => {
      this.raf_id = null;
      this.syncLayout();
    });
  };

  connectedCallback() {
    const { viewport, slot } = this.ensureParts();

    viewport.addEventListener("scroll", this.syncLayout, { passive: true });
    slot.addEventListener("slotchange", this.syncObservedContent);
    this.resize_observer = new ResizeObserver(() => this.scheduleSync());
    this.resize_observer.observe(this);
    this.resize_observer.observe(viewport);
    this.syncObservedContent();
    this.dataset.dragging = "no";
    this.scheduleSync();
  }

  disconnectedCallback() {
    const { viewport, slot } = this.ensureParts();

    viewport.removeEventListener("scroll", this.syncLayout);
    slot.removeEventListener("slotchange", this.syncObservedContent);
    this.resize_observer?.disconnect();
    this.resize_observer = null;
    this.observed_nodes.clear();
    this.dataset.dragging = "no";
    document.body.style.userSelect = "";

    if (this.raf_id !== null) {
      cancelAnimationFrame(this.raf_id);
      this.raf_id = null;
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: PASS for overflow visibility, thumb sizing, and observer cleanup

- [ ] **Step 6: Commit the layout sync layer**

```bash
git add src/elements/v-scroll.ts tests/setup.ts tests/v-scroll.test.ts
git commit -m "feat: add v-scroll layout sync"
```

### Task 4: Implement pointer capture dragging and drag state visuals

**Files:**

- Modify: `src/elements/v-scroll.ts`
- Modify: `tests/v-scroll.test.ts`

- [ ] **Step 1: Add failing drag interaction tests**

```ts
it("captures the pointer and maps drag distance into scrollTop", () => {
  registerVScroll();

  const host = document.createElement("v-scroll");
  document.body.append(host);

  const viewport = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_viewport="yes"]',
    ),
    track = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_track="yes"]',
    ),
    thumb = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_thumb="yes"]',
    );

  Object.defineProperties(viewport!, {
    clientHeight: { configurable: true, value: 300 },
    scrollHeight: { configurable: true, value: 900 },
    scrollTop: { configurable: true, value: 0, writable: true },
  });

  Object.defineProperty(track!, "clientHeight", {
    configurable: true,
    value: 180,
  });
  thumb!.setPointerCapture = vi.fn();

  viewport!.dispatchEvent(new Event("scroll"));
  thumb!.dispatchEvent(
    new PointerEvent("pointerdown", {
      pointerId: 7,
      clientY: 20,
      bubbles: true,
    }),
  );
  thumb!.dispatchEvent(
    new PointerEvent("pointermove", {
      pointerId: 7,
      clientY: 97,
      bubbles: true,
    }),
  );

  expect(thumb!.setPointerCapture).toHaveBeenCalledWith(7);
  expect(host.dataset.dragging).toBe("yes");
  expect(viewport!.scrollTop).toBe(300);
});

it("clears dragging state on pointerup", () => {
  registerVScroll();

  const host = document.createElement("v-scroll");
  document.body.append(host);

  const thumb = host.shadowRoot?.querySelector<HTMLDivElement>(
    '[data_v_scroll_thumb="yes"]',
  );

  thumb!.setPointerCapture = vi.fn();
  thumb!.releasePointerCapture = vi.fn();

  thumb!.dispatchEvent(
    new PointerEvent("pointerdown", {
      pointerId: 5,
      clientY: 10,
      bubbles: true,
    }),
  );
  thumb!.dispatchEvent(
    new PointerEvent("pointerup", { pointerId: 5, clientY: 10, bubbles: true }),
  );

  expect(host.dataset.dragging).toBe("no");
  expect(thumb!.releasePointerCapture).toHaveBeenCalledWith(5);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: FAIL because pointer handlers and drag state do not exist

- [ ] **Step 3: Add pointer drag state and scroll mapping in `src/elements/v-scroll.ts`**

```ts
type DragState = {
  pointer_id: number;
  start_client_y: number;
  start_thumb_offset: number;
};

class VScrollElement extends HTMLElement {
  drag_state: DragState | null;

  constructor() {
    super();
    this.shadow_root = this.attachShadow({ mode: "open" });
    this.parts = null;
    this.resize_observer = null;
    this.raf_id = null;
    this.drag_state = null;
  }

  onPointerDown = (event: PointerEvent) => {
    const { viewport, track, thumb } = this.ensureParts(),
      thumb_size = getThumbSize({
        track_size: track.clientHeight,
        client_size: viewport.clientHeight,
        scroll_size: viewport.scrollHeight,
      }),
      thumb_offset = getThumbOffset({
        track_size: track.clientHeight,
        thumb_size,
        client_size: viewport.clientHeight,
        scroll_size: viewport.scrollHeight,
        scroll_top: viewport.scrollTop,
      });

    thumb.setPointerCapture(event.pointerId);
    this.drag_state = {
      pointer_id: event.pointerId,
      start_client_y: event.clientY,
      start_thumb_offset: thumb_offset,
    };
    this.dataset.dragging = "yes";
    document.body.style.userSelect = "none";
  };

  onPointerMove = (event: PointerEvent) => {
    const { viewport, track } = this.ensureParts();

    if (!this.drag_state || event.pointerId !== this.drag_state.pointer_id) {
      return;
    }

    const thumb_size = getThumbSize({
        track_size: track.clientHeight,
        client_size: viewport.clientHeight,
        scroll_size: viewport.scrollHeight,
      }),
      next_offset =
        this.drag_state.start_thumb_offset +
        (event.clientY - this.drag_state.start_client_y);

    viewport.scrollTop = getScrollTopFromThumbOffset({
      track_size: track.clientHeight,
      thumb_size,
      client_size: viewport.clientHeight,
      scroll_size: viewport.scrollHeight,
      thumb_offset: next_offset,
    });

    this.syncLayout();
  };

  finishDrag = (pointer_id: number) => {
    const { thumb } = this.ensureParts();

    if (this.drag_state) {
      thumb.releasePointerCapture(pointer_id);
    }

    this.drag_state = null;
    this.dataset.dragging = "no";
    document.body.style.userSelect = "";
  };

  onPointerUp = (event: PointerEvent) => {
    if (this.drag_state && event.pointerId === this.drag_state.pointer_id) {
      this.finishDrag(event.pointerId);
    }
  };

  connectedCallback() {
    const { viewport, thumb, slot } = this.ensureParts();

    viewport.addEventListener("scroll", this.syncLayout, { passive: true });
    slot.addEventListener("slotchange", this.syncObservedContent);
    thumb.addEventListener("pointerdown", this.onPointerDown);
    thumb.addEventListener("pointermove", this.onPointerMove);
    thumb.addEventListener("pointerup", this.onPointerUp);
    thumb.addEventListener("pointercancel", this.onPointerUp);
    this.resize_observer = new ResizeObserver(() => this.scheduleSync());
    this.resize_observer.observe(this);
    this.resize_observer.observe(viewport);
    this.syncObservedContent();
    this.dataset.dragging = "no";
    this.scheduleSync();
  }

  disconnectedCallback() {
    const { viewport, thumb, slot } = this.ensureParts();

    viewport.removeEventListener("scroll", this.syncLayout);
    slot.removeEventListener("slotchange", this.syncObservedContent);
    thumb.removeEventListener("pointerdown", this.onPointerDown);
    thumb.removeEventListener("pointermove", this.onPointerMove);
    thumb.removeEventListener("pointerup", this.onPointerUp);
    thumb.removeEventListener("pointercancel", this.onPointerUp);
    this.resize_observer?.disconnect();
    this.resize_observer = null;
    this.observed_nodes.clear();

    if (this.raf_id !== null) {
      cancelAnimationFrame(this.raf_id);
      this.raf_id = null;
    }

    if (this.drag_state) {
      this.finishDrag(this.drag_state.pointer_id);
    } else {
      this.dataset.dragging = "no";
      document.body.style.userSelect = "";
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test tests/v-scroll.test.ts`  
Expected: PASS for pointer capture, drag mapping, and drag cleanup

- [ ] **Step 5: Commit the drag behavior**

```bash
git add src/elements/v-scroll.ts tests/v-scroll.test.ts
git commit -m "feat: add v-scroll thumb dragging"
```

### Task 5: Match the single-theme demo and final verification path

**Files:**

- Modify: `themes/default/v-scroll.css`
- Modify: `src/main.ts`
- Modify: `tests/v-scroll.test.ts`

- [ ] **Step 1: Add a failing style hook test for hover and dragging state**

```ts
it("exposes data attributes and part hooks for theme styling", () => {
  registerVScroll();

  const host = document.createElement("v-scroll");
  document.body.append(host);

  const track = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_track="yes"]',
    ),
    thumb = host.shadowRoot?.querySelector<HTMLDivElement>(
      '[data_v_scroll_thumb="yes"]',
    ),
    grab = host.shadowRoot?.querySelector<HTMLImageElement>(
      '[data_v_scroll_grab="yes"]',
    );

  expect(host.dataset.scrollable).toBe("no");
  expect(track?.dataset.visible ?? "no").toBe("no");
  expect(thumb?.getAttribute("part")).toBe("thumb");
  expect(grab?.getAttribute("part")).toBe("grab");
});
```

- [ ] **Step 2: Run the full suite to verify there are still gaps**

Run: `./build.sh`  
Expected:

- `tsc --noEmit` PASS
- `vitest run` PASS
- `vite build` PASS

- [ ] **Step 3: Replace `themes/default/v-scroll.css` with the single-theme production styling**

```css
:root {
  --v-scroll-frame-bg: #fff;
  --v-scroll-frame-border: rgb(15 23 42 / 10%);
  --v-scroll-text: #0f172a;
  --v-scroll-track-width: 10px;
  --v-scroll-track-inset: 3px;
  --v-scroll-thumb-radius: 999px;
  --v-scroll-thumb-bg: rgb(15 23 42 / 22%);
  --v-scroll-thumb-bg-hover: rgb(15 23 42 / 34%);
  --v-scroll-thumb-bg-dragging: #2563eb;
  --v-scroll-thumb-min-size: 16px;
}

v-scroll {
  display: block;
  color: var(--v-scroll-text);

  &::part(frame) {
    position: relative;
    min-block-size: 320px;
    padding: 20px;
    overflow: hidden;
    border: 1px solid var(--v-scroll-frame-border);
    background: var(--v-scroll-frame-bg);
  }

  &::part(viewport) {
    block-size: 320px;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  &::part(viewport)::-webkit-scrollbar {
    display: none;
  }

  &::part(track) {
    position: absolute;
    inset-block: 3px;
    inset-inline-end: 3px;
    inline-size: var(--v-scroll-track-width);
    border-radius: 999px;
    opacity: 0;
    transition: opacity 160ms ease;
  }

  &::part(thumb) {
    display: grid;
    place-items: center;
    inline-size: 100%;
    min-block-size: var(--v-scroll-thumb-min-size);
    border-radius: var(--v-scroll-thumb-radius);
    background: var(--v-scroll-thumb-bg);
    transition: background-color 160ms ease;
  }

  &::part(grab) {
    inline-size: 15px;
    block-size: 14px;
    pointer-events: none;
    user-select: none;
  }

  &[data_scrollable="yes"]:hover::part(track),
  &[data_scrollable="yes"][data_dragging="yes"]::part(track),
  &[data_scrollable="yes"]::part(track) {
    opacity: 1;
  }

  &:hover::part(thumb) {
    background: var(--v-scroll-thumb-bg-hover);
  }

  &[data_dragging="yes"]::part(thumb) {
    background: var(--v-scroll-thumb-bg-dragging);
  }
}
```

- [ ] **Step 4: Update `src/main.ts` so the demo clearly shows the finished component**

```ts
import css_text from "$/v-scroll.js";
import { createSeedContent } from "./demo/seed-content";
import { registerVScroll } from "./elements/v-scroll";
import { ensureThemeCss } from "./runtime/inject-theme-css";

const renderApp = () => {
  registerVScroll();
  ensureThemeCss(css_text);

  const app_root = document.querySelector<HTMLDivElement>("#app");

  if (!app_root) {
    throw new Error("Expected #app root node");
  }

  app_root.innerHTML = "";

  const page = document.createElement("section"),
    heading = document.createElement("h1"),
    shell = document.createElement("v-scroll");

  heading.textContent = "v-scroll demo";
  shell.append(createSeedContent());
  page.append(heading, shell);
  app_root.append(page);
};

renderApp();
```

- [ ] **Step 5: Run the full verification path**

Run: `./build.sh`  
Expected:

- `tsc --noEmit` PASS
- `vitest run` PASS
- `vite build` PASS

- [ ] **Step 6: Commit the finished component**

```bash
git add src/main.ts themes/default/v-scroll.css tests/v-scroll.test.ts
git commit -m "feat: complete v-scroll component"
```
