# Atlas Visual Polish Design

## Goal

Turn the existing repository atlas from a flat utility surface into a layered, cohesive product while preserving its content, information architecture, filters, URL state, accessibility, and responsive behavior.

## Approved Scope

- Implement the visual and interaction recommendations from the supplied design review.
- Apply the changes to the existing atlas instead of restructuring the application.
- Keep search updates immediate and free of layout transitions or viewport jumps.
- Apply layout transitions only to category, tag, and reset actions.
- Preserve the existing reduced-motion preference.
- Exclude the optional dark mode follow-up.

## Visual Thesis

A calm paper atlas with crisp technical typography, quiet category color, elevated white repository surfaces, and a translucent header that keeps the interface useful rather than decorative.

## Content Plan

The current content hierarchy remains unchanged: brand and collection count, global search, category navigation, tag controls, result count, repository cards, and empty state. The work changes presentation and feedback only. No content source, generated data, route, filter semantics, or external link behavior changes.

## Interaction Thesis

- Category, tag, and reset actions move surviving cards into place with native View Transitions and cross-fade entering or leaving cards.
- Repository cards use a short capped entrance stagger, a restrained hover lift, and a directional external-link cue.
- Buttons provide press feedback, the tag panel expands from its trigger, category selection grows its active marker, counts tick on change, and avatars fade in after loading.

## Considered Approaches

### Neutral Tags Only

Use green for all selected states and neutral repository tags. This has the smallest code surface, but it removes useful category personality from a large repeated element.

### Category Hue Tokens

Set one stable hue token on each repository card and derive tag background, text, and border colors with OKLCH. This is the approved approach because it creates systematic category identity without adding hand-tuned color classes or changing the data model.

### Motion Library

Use a motion dependency for shared layout and exit animation. This offers more control, but native View Transitions already cover the requested filter reflow and avoid a new dependency. The approved implementation uses the native API with an immediate fallback.

## Component Changes

### Repository Atlas

- Add a stable hue lookup by category slug.
- Give each repository card a stable `viewTransitionName` and capped stagger index.
- Use `flushSync` inside `document.startViewTransition` for category, tag, and reset actions.
- Bypass View Transitions and scrolling for search input changes.
- Keep the all-tags panel mounted and make it inert while collapsed.
- Mark avatars loaded from their real image load event.
- Re-key the result number so count changes can animate.

### Global Styles

- Use the soft paper color for the page and white for elevated controls and cards.
- Increase the shared product radius to 10px.
- Add two-layer card shadows and a stronger hover lift.
- Add translucent blur and saturation to the sticky header.
- Replace routine blue states with green and reserve coral for clearing filters.
- Derive repository tag colors from the card category hue.
- Use the mono face for tags and numeric metadata.
- Add the requested entrance, layout, expansion, count, active marker, avatar, icon, and press motions.
- Disable transitions and animations under reduced-motion preferences.

## Compatibility And Fallbacks

- Browsers without `document.startViewTransition` receive the same immediate filter result and viewport reset.
- Reduced-motion users bypass native layout transitions and CSS animations.
- A collapsed tag panel remains in the DOM for animation but uses `inert` and `aria-hidden` so its controls are not interactive.
- Existing URL synchronization and browser history behavior remain unchanged.

## Verification

- Add source-level tests for transition routing, stable card identity, panel accessibility state, and style hooks before production changes.
- Run the existing unit tests, lint, production build, and rendered HTML checks.
- Run a temporary proof script that executes the checks and validates the required implementation markers, then delete it.
- Verify the desktop and mobile UI in a real browser, including category selection, tag selection, search, all-tags expansion, reset, and reduced-motion behavior.
