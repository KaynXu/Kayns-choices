import assert from "node:assert/strict";
import test from "node:test";

import { parseRepositoryAtlas } from "../scripts/repo-parser.mjs";

const VALID_MARKDOWN = `# Atlas

## Navigation

- [AI-Tools](#ai-tools)

## Inbox

| Repo | One-liner |
|---|---|
| _Empty_ | Nothing waiting |

## AI-Tools

| Repo | One-liner | Tags |
|---|---|---|
| [owner/tool](https://github.com/owner/tool "repo-id: 42") | Useful tool | ai, cli |
`;

test("parses categories, repository fields, and derived counts", () => {
  const atlas = parseRepositoryAtlas(VALID_MARKDOWN);

  assert.deepEqual(atlas.categories, [
    { name: "Inbox", slug: "inbox", count: 0 },
    { name: "AI-Tools", slug: "ai-tools", count: 1 },
  ]);
  assert.deepEqual(atlas.repositories[0], {
    id: "42",
    fullName: "owner/tool",
    owner: "owner",
    url: "https://github.com/owner/tool",
    avatarUrl: "https://github.com/owner.png?size=96",
    note: "Useful tool",
    tags: ["ai", "cli"],
    category: "AI-Tools",
    categorySlug: "ai-tools",
  });
  assert.deepEqual(atlas.tags, [
    { name: "ai", count: 1 },
    { name: "cli", count: 1 },
  ]);
});

test("uses a stable repository name when repo-id metadata is absent", () => {
  const atlas = parseRepositoryAtlas(
    VALID_MARKDOWN.replace(' "repo-id: 42"', ""),
  );

  assert.equal(atlas.repositories[0].id, "owner/tool");
});

test("rejects a non-GitHub repository link", () => {
  const markdown = VALID_MARKDOWN.replace(
    "https://github.com/owner/tool",
    "https://example.com/owner/tool",
  );

  assert.throws(
    () => parseRepositoryAtlas(markdown),
    /AI-Tools row 1 has an invalid GitHub repository link/,
  );
});

test("rejects a category table with missing required columns", () => {
  const markdown = VALID_MARKDOWN.replace(" | Tags |", " |").replace(
    "|---|---|---|",
    "|---|---|",
  );

  assert.throws(
    () => parseRepositoryAtlas(markdown),
    /AI-Tools table is missing required column: Tags/,
  );
});

test("rejects duplicate repositories across categories", () => {
  const markdown = `${VALID_MARKDOWN}

## Developer-Tools

| Repo | One-liner | Tags |
|---|---|---|
| [owner/tool](https://github.com/owner/tool) | Duplicate | cli |
`;

  assert.throws(
    () => parseRepositoryAtlas(markdown),
    /Duplicate repository: owner\/tool/,
  );
});

test("rejects malformed repository rows", () => {
  const markdown = VALID_MARKDOWN.replace(
    "[owner/tool](https://github.com/owner/tool \"repo-id: 42\")",
    "owner/tool",
  );

  assert.throws(
    () => parseRepositoryAtlas(markdown),
    /AI-Tools row 1 has no repository link/,
  );
});
