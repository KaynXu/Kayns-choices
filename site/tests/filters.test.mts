import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRepositories,
  readFilters,
  writeFilters,
} from "../app/lib/filters";
import type { Repository } from "../app/lib/types";

const repositories: Repository[] = [
  {
    id: "1",
    fullName: "owner/agent-cli",
    owner: "owner",
    url: "https://github.com/owner/agent-cli",
    avatarUrl: "https://github.com/owner.png?size=96",
    note: "Fast terminal agent",
    tags: ["ai", "cli"],
    category: "AI-Tools",
    categorySlug: "ai-tools",
  },
  {
    id: "2",
    fullName: "owner/canvas",
    owner: "owner",
    url: "https://github.com/owner/canvas",
    avatarUrl: "https://github.com/owner.png?size=96",
    note: "Visual animation toolkit",
    tags: ["animation", "typescript"],
    category: "Visualisation",
    categorySlug: "visualisation",
  },
];

test("returns all repositories for empty filters", () => {
  assert.deepEqual(
    filterRepositories(repositories, { query: "", category: "", tags: [] }),
    repositories,
  );
});

test("matches query across name, note, tags, and category", () => {
  for (const query of ["AGENT-CLI", "terminal", "CLI", "ai-tools"]) {
    assert.deepEqual(
      filterRepositories(repositories, { query, category: "", tags: [] }).map(
        (repository) => repository.id,
      ),
      ["1"],
    );
  }
});

test("combines query, category, and every selected tag", () => {
  assert.deepEqual(
    filterRepositories(repositories, {
      query: "agent",
      category: "ai-tools",
      tags: ["cli", "ai"],
    }).map((repository) => repository.fullName),
    ["owner/agent-cli"],
  );

  assert.deepEqual(
    filterRepositories(repositories, {
      query: "agent",
      category: "ai-tools",
      tags: ["cli", "animation"],
    }),
    [],
  );
});

test("reads valid filters and drops unknown URL values", () => {
  const filters = readFilters(
    new URLSearchParams("q=Agent&category=unknown&tags=cli,missing,ai"),
    ["ai-tools", "visualisation"],
    ["ai", "cli", "animation", "typescript"],
  );

  assert.deepEqual(filters, {
    query: "Agent",
    category: "",
    tags: ["cli", "ai"],
  });
});

test("serializes filters in deterministic URL order", () => {
  const searchParams = writeFilters({
    query: " agent ",
    category: "ai-tools",
    tags: ["cli", "ai", "cli"],
  });

  assert.equal(
    searchParams.toString(),
    "q=agent&category=ai-tools&tags=ai%2Ccli",
  );
});

test("omits empty filter keys from the URL", () => {
  assert.equal(
    writeFilters({ query: " ", category: "", tags: [] }).toString(),
    "",
  );
});
