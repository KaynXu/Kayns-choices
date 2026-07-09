# Kayn's Choices Site Design

## Goal

Turn the existing curated GitHub stars README into a public, responsive site that is equally useful as a personal lookup tool and a browsable public collection.

## Scope

- Build a single-page repository atlas focused on browsing, search, and filtering.
- Keep `README.md` as the only content source.
- Exclude content editing, authentication, accounts, comments, favorites, and persistent user data.
- Preserve every repository name, note, tag, category, and GitHub link already present in the README.

## Experience

The first viewport introduces `Kayn's Choices`, shows the size of the collection, and puts global search immediately within reach. A compact category navigation and tag filters let visitors narrow the collection without leaving the page. Results are displayed as scan-friendly repository cards with the repository name, category, Chinese note, tags, and external GitHub action.

Search matches repository names, notes, tags, and categories. Category and tag filters combine with search. The result count updates immediately, active filters are visible and removable, and a no-results state provides a single clear reset action. Filter state is encoded in the URL so a view can be bookmarked or shared.

## Visual Direction

Use a crisp atlas and index aesthetic rather than a marketing landing page. The interface should feel deliberate, technical, and personal, with restrained surfaces, compact spacing, strong typography, and more than one accent color for categories and status. Cards use small corner radii, clear borders, and stable dimensions. Motion is limited to useful hover and filter transitions and respects reduced-motion preferences.

The layout is responsive from mobile to wide desktop. Desktop uses a persistent category rail with a dense results area. Mobile uses a compact top bar and horizontally scrollable category controls without hiding core functionality.

## Architecture

- Initialize a Sites-compatible React project in the existing repository.
- Parse `README.md` at build time with a structured Markdown parser.
- Convert headings and tables into typed category and repository records.
- Pass the generated repository data to a client-side atlas view.
- Keep search and filter logic in small pure functions that can be tested independently.
- Store query, category, and selected tags in URL search parameters.

## States And Errors

- Empty Inbox is represented as an empty category, not a repository card.
- No search matches shows a reset action and preserves the typed query.
- Missing table columns, malformed repository links, or duplicate repository records fail the build with an actionable parser error.
- External links open GitHub with safe new-tab behavior.

## Verification

- Parser tests cover the current README structure, empty categories, and malformed rows.
- Search and filter tests cover combined query, category, and tag behavior.
- A production build proves the README can be parsed and the site can be generated.
- Browser verification covers search, filter reset, external links, desktop layout, and mobile layout.
- A temporary proof script runs the required checks and prints complete output before it is removed.

