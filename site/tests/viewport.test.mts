import assert from "node:assert/strict";
import test from "node:test";

import { scrollAtlasToTop } from "../app/lib/viewport";

test("resets the atlas viewport after a filter change", () => {
  let receivedOptions: ScrollToOptions | undefined;
  const viewport = {
    scrollTo(options: ScrollToOptions) {
      receivedOptions = options;
    },
  };

  scrollAtlasToTop(viewport);

  assert.deepEqual(receivedOptions, {
    top: 0,
    left: 0,
    behavior: "auto",
  });
});
