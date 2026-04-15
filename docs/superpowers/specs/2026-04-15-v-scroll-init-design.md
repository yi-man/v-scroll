# v-scroll Project Initialization Design

## Goal

Initialize a runnable project skeleton for the `v-scroll` take-home assignment without implementing the actual virtual scrollbar behavior yet.

The initialized project must already reserve and demonstrate all required engineering boundaries from the PDF so that later feature work can proceed without structural rework.

## Confirmed Scope

This design covers project initialization only.

Included:

- `bun`-based project setup
- `TypeScript`-based Vite application skeleton
- root `AGENTS.md` containing the PDF constraints
- runnable demo page
- placeholder `<v-scroll>` custom element registration
- independent theme CSS source
- `importmap`-based theme module path
- Vite custom plugin skeleton using `configResolved`
- CSS string injection runtime
- `build.sh` verification entrypoint
- directory structure for later implementation

Excluded:

- actual virtual scrollbar behavior
- real scroll container takeover and native scrollbar hiding details
- `ResizeObserver`-driven size detection
- `Pointer Events` drag logic and pointer capture
- lifecycle disposal for detach and route switching
- visual parity with the reference video
- deployment setup for GitHub Pages or Cloudflare Pages

## Source Requirement Mapping

The PDF establishes these non-negotiable requirements that affect initialization:

1. The project must use `bun`.
2. The build stack must be based on `Vite`.
3. The final component is a native custom element named `v-scroll`.
4. The component must ultimately support arbitrary DOM children wrapped inside `<v-scroll>...</v-scroll>`.
5. Styles must be kept in an independent CSS file rather than authored directly inside JavaScript.
6. Theme CSS must be exposed through an `importmap`-controlled module path.
7. A Vite plugin must use `configResolved` to read the CSS source, compress it, and emit a JavaScript module exporting the CSS string.
8. The repository should contain an `AGENTS.md` aligned with the provided coding guidance.
9. The final work should be able to run through a shared build entrypoint such as `./build.sh`.

The project skeleton will explicitly reserve all of these constraints up front.

## Chosen Approach

Use a single Vite application repository that contains:

- the component source
- the theme source
- the runtime theme injection path
- the custom Vite plugin
- a local demo page

This is preferred over a library-first split because it keeps the assignment surface small while still preserving all later extension points required by the PDF.

## Project Structure

```text
v-scroll/
  AGENTS.md
  build.sh
  package.json
  bun.lock
  tsconfig.json
  vite.config.ts
  index.html
  src/
    main.ts
    demo/
      seed-content.ts
    elements/
      v-scroll.ts
    runtime/
      inject-theme-css.ts
    theme-imports/
      v-scroll.ts
  themes/
    default/
      v-scroll.css
  scripts/
    vite-plugin-vscroll-theme.ts
  public/
  docs/
    superpowers/
      specs/
```

## Architecture

### Entry Layer

`index.html` will:

- define the `importmap` required by the assignment
- map `$/` to `/src/theme-imports/` during local development
- render a minimal demo container
- load `src/main.ts`

This preserves the required runtime contract early: component code consumes a theme module through `$/v-scroll.js` semantics instead of coupling directly to a fixed filesystem path.

### App Bootstrap

`src/main.ts` will:

- import the custom element registration module
- import the theme CSS injection runtime
- create or attach seeded demo content
- render a visible example `<v-scroll>` usage on the page

The page exists to verify that the development chain is working, not to simulate final interactions.

### Custom Element Placeholder

`src/elements/v-scroll.ts` will:

- register `customElements.define("v-scroll", ...)`
- create only the minimum internal structure needed for a visible placeholder
- preserve a clear boundary for later migration to the real scrolling architecture

The placeholder implementation should avoid embedding feature logic now, but it should make future responsibilities obvious:

- host child content
- own scrollbar presentation structure later
- expose parts for later styling customization

### Theme Source and Import Contract

`themes/default/v-scroll.css` will remain the canonical raw CSS source.

`src/theme-imports/v-scroll.ts` will provide the development-facing theme module that matches the assignment's import contract. The important architectural decision is that component runtime code depends on a theme module boundary, not directly on raw CSS files.

This keeps later theme switching a matter of changing `importmap`, which is exactly the extension model described in the PDF.

### Theme Injection Runtime

`src/runtime/inject-theme-css.ts` will:

- import the CSS string from the theme module
- inject a `<style>` tag into `document.head`
- deduplicate repeated insertion during dev reloads

The injection runtime is intentionally separate from component registration so that styling concerns and element concerns remain isolated.

### Vite Plugin Skeleton

`scripts/vite-plugin-vscroll-theme.ts` will implement a custom Vite plugin that:

- uses `configResolved`
- reads the component theme CSS source
- compresses CSS by removing comments and unnecessary whitespace
- emits or writes a JavaScript module shaped like `export default "..."` for the theme import path

At initialization time the plugin only needs to establish the pipeline and naming contract. It does not need to solve all future production edge cases.

## Styling Strategy

The initialization phase will include only placeholder theme styling.

The CSS should still reserve the following later-facing decisions:

- use native CSS nesting
- expose stable part names for the component shell and later scrollbar pieces
- define CSS custom properties for future hover and dragging states
- avoid hard-coding behavior into JavaScript styling

This aligns the project with the PDF requirement that style customization remain externalizable.

## Demo Strategy

The demo page will intentionally contain a minimal but real usage example:

- a visible page layout
- seeded content long enough to make the future scrolling use case obvious
- one rendered `<v-scroll>` instance
- placeholder visuals only

The demo exists to validate:

- the project runs under `bun`
- Vite serves the app correctly
- the custom element registration succeeds
- the `importmap` path resolves
- the theme injection works

## Tooling Decisions

### TypeScript

Although the PDF describes native JavaScript, the confirmed project direction for initialization is to use `TypeScript`.

This means:

- project source files use `.ts`
- Vite config uses `vite.config.ts`
- the component remains browser-native at runtime
- TypeScript is used for authoring discipline only, not for introducing frameworks

This does not conflict with the assignment's main constraints because the runtime target remains framework-free Web Components plus CSS.

### bun

`bun` is the package manager and script runner.

The skeleton should define scripts for at least:

- `dev`
- `build`
- `preview`
- `check` or equivalent validation

`build.sh` will call the relevant bun-backed verification commands so the repository has one stable entrypoint matching the PDF note.

## AGENTS.md Content

The root `AGENTS.md` must include the PDF guidance in repository form.

It should explicitly capture at least:

- install dependencies with `bun i`
- use modern JavaScript and TypeScript syntax
- constants naming and function naming conventions
- prefer arrow functions over `function`
- merge adjacent `const` declarations where reasonable
- prefer importing functions instead of whole modules where possible
- variable naming in underscore style and function naming in lower camel case
- prefer `await` over `.then`
- prefer pure functions and avoid classes where possible
- emphasize reuse and small functions
- use native CSS nesting
- avoid unnecessary `export default` declarations unless required by `import.meta.main`
- run `./build.sh` after modifications

Because the repository uses a custom element class to register `v-scroll`, the `AGENTS.md` should also note that browser platform APIs may require minimal class usage where the platform contract leaves no practical pure-function alternative.

## Initialization Acceptance Criteria

The initialization work will be considered complete when all of the following are true:

1. `bun install` succeeds.
2. `bun run dev` serves a working page.
3. The page renders a demo containing a registered `<v-scroll>` element.
4. Theme styles are loaded through the `$/v-scroll.js` import path contract.
5. `bun run build` succeeds.
6. `./build.sh` succeeds.
7. The repository root contains `AGENTS.md` with the PDF constraints.
8. The codebase structure already reserves clear locations for later implementation of:
   - native scroll container
   - custom scrollbar DOM
   - `ResizeObserver`
   - `Pointer Events`
   - cleanup and disposal logic

## Risks and Mitigations

### Risk: TypeScript deviates from the PDF wording

Mitigation:
Use TypeScript only as authoring tooling while keeping the runtime strictly framework-free and browser-native.

### Risk: AGENTS.md guidance conflicts with Web Components implementation

Mitigation:
Carry the PDF rules into `AGENTS.md`, but document the narrow exception that native custom elements may require a class because `customElements` integrates with `HTMLElement` subclasses.

### Risk: Theme import contract becomes different in dev and build

Mitigation:
Make the import contract stable from day one through the `$/` mapping and a dedicated theme module boundary.

## Implementation Boundary

This design intentionally stops before behavior implementation.

The next stage should plan and implement:

- actual scroll container composition
- hidden native scrollbar behavior
- custom track and thumb rendering
- scroll position mapping
- pointer capture drag handling
- resize observation
- detach cleanup
- visual fidelity to the reference
