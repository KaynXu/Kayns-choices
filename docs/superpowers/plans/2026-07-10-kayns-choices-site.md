# Kayn's Choices Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a responsive repository atlas that turns the existing README collection into a fast browsing and search experience.

**Architecture:** A Sites-compatible vinext application lives in `site/`. A build-time Markdown pipeline parses the root `README.md` into generated JSON, while a client-side atlas component performs URL-backed search and filtering without a database or editor.

**Tech Stack:** React 19, Next 16 through vinext, TypeScript, CSS, unified with remark-gfm, lucide-react, Node test runner, Cloudflare Workers through Sites.

## Global Constraints

- `README.md` remains the only authored content source.
- The site is a single-page browsing, search, and filtering experience.
- Editing, authentication, accounts, comments, favorites, and persistent user data are excluded.
- Search matches repository names, notes, tags, and categories.
- Query, category, and selected tags are stored in URL search parameters.
- The layout must work from mobile through wide desktop and respect reduced-motion preferences.
- Missing table columns, malformed GitHub links, and duplicate repositories must produce actionable build errors.
- All repository links open GitHub in a safe new tab.

---

### Task 1: Initialize The Sites Application

**Files:**
- Create: `site/` from the bundled Sites vinext starter
- Modify: `site/package.json`
- Modify: `site/.openai/hosting.json`
- Delete: `site/app/_sites-preview/SkeletonPreview.tsx`
- Delete: `site/app/_sites-preview/preview.css`

**Interfaces:**
- Consumes: The bundled Sites initializer at `/Users/Ark.0/.codex/plugins/cache/openai-bundled/sites/0.1.27/scripts/init-site.sh`.
- Produces: A runnable `site/` application with `npm run dev`, `npm run build`, `npm run test:unit`, and `npm test` commands.

- [ ] **Step 1: Initialize the isolated site surface**

Run:

```bash
/Users/Ark.0/.codex/plugins/cache/openai-bundled/sites/0.1.27/scripts/init-site.sh /Users/Ark.0/Desktop/Kayns-choices/site
```

Expected: The starter is copied into `site/` and `npm ci` completes successfully.

- [ ] **Step 2: Start the development server**

Run from `site/`:

```bash
npm run dev
```

Expected: vinext prints a healthy local URL and keeps the process running.

- [ ] **Step 3: Replace starter dependencies and scripts**

Update `package.json` so the relevant entries are:

```json
{
  "name": "kayns-choices-site",
  "scripts": {
    "generate:data": "node scripts/generate-repos.mjs",
    "predev": "npm run generate:data",
    "dev": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext dev",
    "prebuild": "npm run generate:data",
    "build": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext build",
    "test:unit": "tsx --test tests/repo-parser.test.mts tests/filters.test.mts",
    "test": "npm run test:unit && npm run build && node --test tests/rendered-html.test.mjs"
  },
  "dependencies": {
    "lucide-react": "latest",
    "remark-gfm": "latest",
    "remark-parse": "latest",
    "unified": "latest"
  },
  "devDependencies": {
    "tsx": "latest"
  }
}
```

Preserve the starter's other required dependencies and devDependencies, remove `react-loading-skeleton`, and run `npm install` to refresh `package-lock.json`.

- [ ] **Step 4: Remove disposable preview code**

Delete `site/app/_sites-preview/`, remove its import from `site/app/page.tsx`, and remove the `codex-preview` metadata marker.

- [ ] **Step 5: Commit the initialized application**

```bash
git add site
git commit -m "chore: initialize repository atlas site"
```

---

### Task 2: Parse README Data At Build Time

**Files:**
- Create: `site/scripts/repo-parser.mjs`
- Create: `site/scripts/generate-repos.mjs`
- Create: `site/app/data/repos.generated.json`
- Create: `site/app/lib/types.ts`
- Create: `site/tests/repo-parser.test.mts`

**Interfaces:**
- Consumes: Root `README.md` headings and GitHub-flavored Markdown tables.
- Produces: `parseRepositoryAtlas(markdown: string): RepositoryAtlas` and generated JSON shaped as `{ categories: Category[]; repositories: Repository[]; tags: TagCount[] }`.

- [ ] **Step 1: Write failing parser tests**

Create `site/tests/repo-parser.test.mts` with cases that assert a valid category and row, an empty Inbox, malformed links, missing columns, and duplicate URLs. The core valid fixture is:

```ts
const markdown = `## AI-Tools

| Repo | One-liner | Tags |
|---|---|---|
| [owner/tool](https://github.com/owner/tool "repo-id: 42") | Useful tool | ai, cli |
`;

const atlas = parseRepositoryAtlas(markdown);
assert.equal(atlas.repositories[0].fullName, "owner/tool");
assert.deepEqual(atlas.repositories[0].tags, ["ai", "cli"]);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test tests/repo-parser.test.mts
```

Expected: FAIL because `scripts/repo-parser.mjs` does not exist.

- [ ] **Step 3: Implement the structured Markdown parser**

Implement `parseRepositoryAtlas` with `unified().use(remarkParse).use(remarkGfm).parse(markdown)`. Walk level-two headings and GFM table nodes, require `Repo`, `One-liner`, and `Tags` for non-Inbox content, parse GitHub links with the URL API, and reject duplicate `fullName` values. Return stable slugs, repository IDs, owner avatar URLs, category counts, and sorted tag counts.

```js
export function parseRepositoryAtlas(markdown) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const categories = [];
  const repositories = [];
  // Walk heading and table nodes, validate each row, then derive counts.
  return { categories, repositories, tags: countTags(repositories) };
}
```

- [ ] **Step 4: Generate committed JSON from the real README**

Implement `site/scripts/generate-repos.mjs`:

```js
const readmePath = new URL("../../README.md", import.meta.url);
const outputPath = new URL("../app/data/repos.generated.json", import.meta.url);
const atlas = parseRepositoryAtlas(await readFile(readmePath, "utf8"));
await writeFile(outputPath, `${JSON.stringify(atlas, null, 2)}\n`);
console.log(`Generated ${atlas.repositories.length} repositories.`);
```

Run `npm run generate:data` and verify the output reports 95 repositories.

- [ ] **Step 5: Run parser tests and commit**

Run:

```bash
npm run test:unit -- tests/repo-parser.test.mts
```

Expected: All parser tests PASS.

Commit:

```bash
git add site/scripts site/app/data site/app/lib/types.ts site/tests/repo-parser.test.mts site/package.json site/package-lock.json
git commit -m "feat: generate atlas data from readme"
```

---

### Task 3: Add Search And Filter Logic

**Files:**
- Create: `site/app/lib/filters.ts`
- Create: `site/tests/filters.test.mts`

**Interfaces:**
- Consumes: `Repository[]` and `AtlasFilters` from `site/app/lib/types.ts`.
- Produces: `filterRepositories(repositories, filters)`, `readFilters(searchParams)`, and `writeFilters(filters)`.

- [ ] **Step 1: Write failing filter tests**

Cover case-insensitive matching across `fullName`, `note`, `tags`, and `category`; combined query plus category plus multiple tags; empty filters; invalid URL categories; and deterministic URL serialization.

```ts
assert.deepEqual(
  filterRepositories(repositories, {
    query: "agent",
    category: "ai-tools",
    tags: ["cli", "ai"],
  }).map((repo) => repo.fullName),
  ["owner/agent-cli"],
);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx tsx --test tests/filters.test.mts
```

Expected: FAIL because `app/lib/filters.ts` does not exist.

- [ ] **Step 3: Implement pure filtering and URL helpers**

Use normalized lowercase text, `every` for selected tags, and `URLSearchParams` for serialization. Omit empty keys and sort tags before writing them so shared URLs remain stable.

- [ ] **Step 4: Run tests and commit**

Run:

```bash
npm run test:unit
```

Expected: Parser and filter tests PASS.

Commit:

```bash
git add site/app/lib/filters.ts site/tests/filters.test.mts
git commit -m "feat: add repository search and filters"
```

---

### Task 4: Build The Responsive Repository Atlas

**Files:**
- Create: `site/app/components/repo-atlas.tsx`
- Modify: `site/app/page.tsx`
- Modify: `site/app/layout.tsx`
- Modify: `site/app/globals.css`
- Replace: `site/public/favicon.svg`
- Modify: `site/tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: Generated `RepositoryAtlas` JSON and filter helpers.
- Produces: The complete single-page `Kayn's Choices` browsing and search experience.

- [ ] **Step 1: Replace the starter rendering test**

Assert that server-rendered HTML returns status 200 and includes `Kayn's Choices`, `95 repositories`, the search label, category navigation, a known repository, site metadata, and no `codex-preview` or loading skeleton markers.

- [ ] **Step 2: Run the rendering test to verify it fails**

Run:

```bash
npm run build && node --test tests/rendered-html.test.mjs
```

Expected: FAIL because the starter page does not contain the atlas.

- [ ] **Step 3: Implement the atlas page**

Create a client component that:

- Reads initial query, category, and tags from `window.location.search`.
- Replaces URL search parameters after each filter change without navigation.
- Renders a stable desktop category rail and a mobile horizontal category control.
- Shows a labeled search input with a Lucide `Search` icon and clear button.
- Shows popular tag toggles and an expandable all-tags panel.
- Renders repository cards with owner avatar, full name, category, Chinese note, tags, and an external GitHub action.
- Shows the live result count and a reset action when filters have no matches.

Use semantic `<header>`, `<nav>`, `<main>`, `<article>`, and `<aside>` elements. Use `aria-pressed` for filter toggles, visible focus states, and `rel="noreferrer"` with `target="_blank"` for external links.

- [ ] **Step 4: Implement the visual system and responsive layout**

Use CSS custom properties for a neutral paper surface, dark ink, green primary accent, coral secondary accent, and blue informational accent. Use 4px to 8px radii, stable avatar and button dimensions, two-column cards at wide widths, one column on smaller screens, and no viewport-scaled typography. Add only opacity and transform transitions, then disable them under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Add metadata and favicon**

Set the document language to `zh-CN`, title to `Kayn's Choices`, and description to `A searchable atlas of GitHub projects worth returning to.` Replace the starter favicon with a compact `KC` mark.

- [ ] **Step 6: Run the complete test suite and commit**

Run:

```bash
npm test
```

Expected: Unit tests, production build, and rendered HTML tests PASS.

Commit:

```bash
git add site/app site/public/favicon.svg site/tests/rendered-html.test.mjs
git commit -m "feat: build responsive repository atlas"
```

---

### Task 5: Add The Social Preview And Validate The Product

**Files:**
- Create: `site/public/og.png`
- Modify: `site/app/layout.tsx`

**Interfaces:**
- Consumes: The finished site's content, palette, typography, and atlas motif.
- Produces: One 1200x630 social preview and site-specific Open Graph and X metadata.

- [ ] **Step 1: Generate one cohesive social card**

Use one image generation request for a landscape `Kayn's Choices` card with exact title text, `95 repos`, a compact indexed-grid motif, and the site's green, coral, blue, paper, and ink palette. Do not generate candidates in parallel.

- [ ] **Step 2: Inspect and wire the image**

Verify the title has no invented or misspelled text. Save the valid result as `site/public/og.png`; if the single retry allowance still fails, omit image metadata. Add absolute host-derived Open Graph and X image metadata in `site/app/layout.tsx`.

- [ ] **Step 3: Run the final build and commit**

Run:

```bash
npm test
```

Expected: All tests and the production build PASS with the social image included.

Commit:

```bash
git add site/public/og.png site/app/layout.tsx
git commit -m "feat: add repository atlas social preview"
```

---

### Task 6: Produce Proof And Publish With Sites

**Files:**
- Temporarily create and then delete: `site/scripts/proof.mjs`
- Modify: `site/.openai/hosting.json`

**Interfaces:**
- Consumes: The validated site source and `dist/` output.
- Produces: Complete proof output, a clean branch merged into `develop`, and a private Sites URL.

- [ ] **Step 1: Run a temporary proof script**

Create `site/scripts/proof.mjs` that runs `npm run test:unit`, `npm run build`, and `node --test tests/rendered-html.test.mjs` with inherited output, exits on the first failure, and prints `PROOF_OK` only after all commands pass. Run it once and preserve the complete output for the user-facing report, then delete the script.

- [ ] **Step 2: Check the worktree and commit the validated source**

Confirm only the user's pre-existing `handoff.md` deletion remains outside the site work. Commit any final generated data or metadata changes without staging that deletion.

- [ ] **Step 3: Create and persist the Sites project**

Call Sites `create_site` once, write only its `project_id` to `site/.openai/hosting.json`, commit the validated source, and push the branch head using the returned temporary write credential.

- [ ] **Step 4: Package and deploy privately**

Run:

```bash
/Users/Ark.0/.codex/plugins/cache/openai-bundled/sites/0.1.27/scripts/package-site.sh /Users/Ark.0/Desktop/Kayns-choices/site /tmp/kayns-choices-site.tar.gz
```

Save one Sites version from the archive and exact branch-head SHA, deploy it privately, and poll until the deployment succeeds or fails.

- [ ] **Step 5: Finish the development branch**

Merge `codex/kayns-choices-site` into `develop` without squash, delete the feature branch after leaving it, and keep `main` unchanged. Preserve the user's pre-existing `handoff.md` deletion.

