import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  encodeViewTransitionName,
  runFilterTransition,
} from "../app/lib/filter-transition";

const VIEW_TRANSITION_NAME = /^card-[0-9a-f]+(?:-[0-9a-f]+)*$/;

const generatedAtlas = JSON.parse(
  readFileSync(
    new URL("../app/data/repos.generated.json", import.meta.url),
    "utf8",
  ),
) as { repositories: Array<{ id: string }> };

test("encodes slash IDs as legal view transition custom identifiers", () => {
  const encoded = encodeViewTransitionName("owner/repository");

  assert.equal(
    encoded,
    "card-6f-77-6e-65-72-2f-72-65-70-6f-73-69-74-6f-72-79",
  );
  assert.match(encoded, VIEW_TRANSITION_NAME);
});

test("keeps distinct code point sequences collision free", () => {
  assert.notEqual(
    encodeViewTransitionName("owner/repository"),
    encodeViewTransitionName("owner-repository"),
  );
  assert.notEqual(
    encodeViewTransitionName(String.fromCodePoint(0x1, 0x23)),
    encodeViewTransitionName(String.fromCodePoint(0x12, 0x3)),
  );
});

test("encodes all generated repository IDs as legal unique names", () => {
  const repositoryIds = generatedAtlas.repositories.map(({ id }) => id);
  const encodedNames = repositoryIds.map(encodeViewTransitionName);

  assert.equal(repositoryIds.length, 95);
  assert.equal(repositoryIds.filter((id) => id.includes("/")).length, 21);
  assert.equal(new Set(encodedNames).size, encodedNames.length);
  for (const encodedName of encodedNames) {
    assert.match(encodedName, VIEW_TRANSITION_NAME);
  }
});

test("runs the native transition before flushing the commit and scrolling", () => {
  const order: string[] = [];

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
});

test("commits and scrolls directly when the native transition API is missing", () => {
  const order: string[] = [];

  runFilterTransition({
    commit: () => order.push("commit"),
    scroll: () => order.push("scroll"),
    flush: (callback) => {
      order.push("flush");
      callback();
    },
    reducedMotion: false,
  });

  assert.deepEqual(order, ["commit", "scroll"]);
});

test("commits and scrolls directly when reduced motion is enabled", () => {
  const order: string[] = [];

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
    reducedMotion: true,
  });

  assert.deepEqual(order, ["commit", "scroll"]);
});
