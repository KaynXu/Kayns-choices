import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const siteRoot = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete repository atlas", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const generatedAtlas = JSON.parse(
    await readFile(new URL("../app/data/repos.generated.json", import.meta.url), "utf8"),
  );
  const repositoryCount = generatedAtlas.repositories.length;

  assert.match(html, /<title>Kayn&#x27;s Choices<\/title>/i);
  assert.match(html, /Kayn(?:&#x27;|')s Choices/);
  assert.match(
    html,
    new RegExp(`${repositoryCount}(?:<!-- -->|\\s)*repositories`),
  );
  assert.match(
    html,
    new RegExp(
      `<span class="count-swap">${repositoryCount}</span>(?:<!-- -->|\\s)*results`,
    ),
  );
  assert.match(html, /Search repos, notes, or tags/);
  assert.match(html, /aria-label="Categories"/);
  assert.match(html, /666ghj\/MiroFish/);
  assert.match(
    html,
    /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/,
  );
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|taking shape/i);
});

test("removes starter preview assets and metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /codex-preview|_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", siteRoot)));
});
