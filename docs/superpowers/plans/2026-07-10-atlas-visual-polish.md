# Atlas Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved visual depth, category color system, native filter transitions, and restrained micro-interactions to the existing repository atlas.

**Architecture:** Keep the current page and data flow intact. Add one small transition orchestrator that is unit-testable, wire it into the existing client component only for click-driven filter changes, and implement the visual system in the existing global stylesheet.

**Tech Stack:** React 19, TypeScript 5.9, vinext, CSS custom properties, OKLCH, native View Transitions, Node test runner.

## Global Constraints

- Do not change README parsing, generated repository data, routes, URL serialization, or filter semantics.
- Search typing and search clearing must not start a View Transition or scroll the viewport.
- Category, tag, and full reset actions must scroll to the atlas top after updating.
- Browsers without View Transitions and reduced-motion users must receive an immediate update.
- Do not add a runtime dependency.
- Do not add the optional dark mode.
- Preserve existing staged user changes and do not restore the deleted `handoff.md`.
- Do not commit implementation files while they overlap pre-existing staged user work.

---

### Task 1: Add Testable Filter Transition Orchestration

**Files:**
- Create: `site/tests/filter-transition.test.mts`
- Create: `site/app/lib/filter-transition.ts`

**Interfaces:**
- Consumes: A state commit callback, scroll callback, flush callback, optional native transition callback, and reduced-motion flag.
- Produces: `runFilterTransition(options: FilterTransitionOptions): void`.

- [ ] **Step 1: Write the failing tests**

Cover native ordering, missing-API fallback, and reduced-motion fallback with real callbacks and an order array:

```ts
runFilterTransition({
  commit: () => order.push("commit"),
  scroll: () => order.push("scroll"),
  flush: (callback) => {
    order.push("flush");
    callback();
  },
  start: (callback) => {
    order.push("transition");
    callback();
  },
  reducedMotion: false,
});

assert.deepEqual(order, ["transition", "flush", "commit", "scroll"]);
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `cd site && npx tsx --test tests/filter-transition.test.mts`

Expected: FAIL because `app/lib/filter-transition.ts` does not exist.

- [ ] **Step 3: Implement the minimal orchestrator**

```ts
export interface FilterTransitionOptions {
  commit: () => void;
  scroll: () => void;
  flush: (callback: () => void) => void;
  start?: (callback: () => void) => unknown;
  reducedMotion: boolean;
}

export function runFilterTransition(options: FilterTransitionOptions) {
  if (!options.start || options.reducedMotion) {
    options.commit();
    options.scroll();
    return;
  }

  options.start(() => {
    options.flush(options.commit);
    options.scroll();
  });
}
```

- [ ] **Step 4: Run the tests to verify GREEN**

Run: `cd site && npx tsx --test tests/filter-transition.test.mts`

Expected: 3 tests pass with 0 failures.

---

### Task 2: Wire The Approved Component Behavior

**Files:**
- Create: `site/tests/visual-polish.test.mts`
- Modify: `site/app/components/repo-atlas.tsx`
- Modify: `site/app/lib/filter-transition.ts`
- Modify: `site/tests/filter-transition.test.mts`
- Modify: `site/tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `runFilterTransition`, `flushSync`, existing filter helpers, existing `scrollAtlasToTop`, repository IDs, and category slugs.
- Produces: Click-only filter transitions, stable card transition names, capped stagger values, animated count markup, a persistent accessible all-tags panel, and avatar load state.

- [ ] **Step 1: Write source-level integration tests**

Read `repo-atlas.tsx` and assert that it contains the approved integration points:

```ts
assert.match(component, /runFilterTransition/);
assert.match(component, /viewTransitionName/);
assert.match(component, /encodeViewTransitionName/);
assert.match(component, /Math\.min\(index, 12\)/);
assert.match(component, /inert=\{!showAllTags\}/);
assert.match(component, /className="count-swap"/);
assert.doesNotMatch(searchHandler, /transitionFilters/);
```

Also execute `encodeViewTransitionName` against slash IDs, collision-prone code point sequences, and all 95 generated repository IDs. Assert that every output is a legal custom-ident and all outputs are unique.

- [ ] **Step 2: Run the integration test to verify RED**

Run: `cd site && npx tsx --test tests/visual-polish.test.mts`

Expected: FAIL because the component lacks the required hooks.

- [ ] **Step 3: Implement click-only transition routing**

Import `flushSync` and call `runFilterTransition` from `transitionFilters`. Use a bound optional `document.startViewTransition` and `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. Keep the search input and search clear button on direct `setFilters` calls.

- [ ] **Step 4: Implement stable card and panel markup**

Pass the repository index into `RepositoryCard`, export `encodeViewTransitionName` from `filter-transition.ts`, and encode every repository ID code point as lowercase hexadecimal segments prefixed by `card-` for a stable legal `viewTransitionName`. Set `--card-index` to `Math.min(index, 12)` and set `--cat-h` from a stable category hue lookup. The encoding is required because 21 current fallback IDs contain `/`, which is not valid in an unescaped CSS custom-ident. Keep the tag panel mounted inside `.all-tags-wrap`, set `data-open`, `aria-hidden`, and `inert`, and add `.chevron` classes to expand indicators.

- [ ] **Step 5: Implement count and avatar states**

Render the numeric result inside `<span key={repositories.length} className="count-swap">`. Track each image load in `RepositoryCard`, pass the state through `data-loaded`, and update it from the real `Image` `onLoad` event. Track whether the user has interacted and expose `data-entering` on `.atlas-shell` so the stagger runs for the initial filtered view only; search changes remain visually immediate.

- [ ] **Step 6: Run the unit and integration tests**

Run: `cd site && npx tsx --test tests/filter-transition.test.mts tests/visual-polish.test.mts tests/viewport.test.mts`

Expected: All tests pass with 0 failures.

Update the existing rendered HTML assertion to require the approved `<span class="count-swap">95</span> results` markup, then run `cd site && node --test tests/rendered-html.test.mjs` against the production build.

---

### Task 3: Implement The Visual System And Motion

**Files:**
- Modify: `site/tests/visual-polish.test.mts`
- Modify: `site/app/globals.css`

**Interfaces:**
- Consumes: `--cat-h`, `--card-index`, `.atlas-shell[data-entering]`, `.all-tags-wrap[data-open]`, `.count-swap`, `.chevron`, and repository image load state from Task 2.
- Produces: The complete approved visual and motion treatment.

- [ ] **Step 1: Add failing CSS marker assertions**

Assert that the stylesheet includes the required surface, color, transition, and reduced-motion hooks:

```ts
assert.match(css, /--radius:\s*10px/);
assert.match(css, /backdrop-filter:\s*blur\(10px\) saturate\(1\.8\)/);
assert.match(css, /oklch\(96\.5% 0\.03 var\(--cat-h\)\)/);
assert.match(css, /::view-transition-group\(\*\)/);
assert.match(css, /@keyframes card-in/);
assert.match(css, /\.all-tags-wrap\[data-open="true"\]/);
assert.match(css, /animation-duration:\s*0\.01ms !important/);
```

- [ ] **Step 2: Run the CSS integration test to verify RED**

Run: `cd site && npx tsx --test tests/visual-polish.test.mts`

Expected: FAIL on the first missing CSS marker.

- [ ] **Step 3: Implement surfaces, color, and typography**

Set the canvas to `var(--paper-soft)`, shared radius to 10px, cards to transparent borders with two-layer shadows, and the header to translucent white with blur and saturation. Use the brand gradient, mono face for tags and counts, green for routine selected states, coral only for clear actions, and OKLCH colors derived from `--cat-h` for repository tags.

- [ ] **Step 4: Implement motion and micro-interactions**

Add card hover lift, capped entrance stagger, native View Transition timing, press feedback, external-link icon movement, tag-panel grid-row expansion, chevron rotation, result-count entrance, active-bar growth, and avatar opacity transition. Reduce card minimum height to about 180px and clamp notes to 3 lines.

- [ ] **Step 5: Complete reduced-motion coverage**

Disable CSS animations, delays, transition delays, press transforms, hover transforms, and View Transition animations under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run focused tests, lint, and the full production suite**

Run:

```bash
cd site
npx tsx --test tests/filter-transition.test.mts tests/visual-polish.test.mts tests/viewport.test.mts
npm run lint
npm test
```

Expected: Every command exits 0 with 0 test failures and a successful production build.

---

### Task 4: Browser Verification And Temporary Proof

**Files:**
- Temporarily create and delete: `site/scripts/visual-polish-proof.mjs`

**Interfaces:**
- Consumes: The finished source and the existing development server.
- Produces: Fresh command output and visual evidence without leaving runtime files.

- [ ] **Step 1: Create the temporary proof script**

The script runs the focused tests, lint, and full test suite with inherited stdio, then reads the component and CSS to assert every approved integration marker.

- [ ] **Step 2: Execute the proof script**

Run: `cd site && node scripts/visual-polish-proof.mjs`

Expected: Full child command output followed by `Visual polish proof passed.` and exit 0.

- [ ] **Step 3: Verify desktop and mobile in a real browser**

Check 1440x900 and 390x844. Exercise category, popular tag, all-tags expansion, search typing, search clear, full reset, card hover, external link focus, and reduced-motion emulation. Confirm no horizontal overflow and no console errors.

- [ ] **Step 4: Remove the temporary proof script and inspect the final diff**

Delete `site/scripts/visual-polish-proof.mjs`, confirm no generated runtime files were added, re-read the final diff, and ensure no obsolete styles or handlers remain.
