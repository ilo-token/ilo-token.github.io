// this code is Deno only

import { assertMatch } from "@std/assert/match";
import { dictionary } from "./custom_dictionary.ts";

Deno.test("definition source has leading space", () => {
  for (const [word, { source }] of dictionary) {
    assertMatch(source, /^\s/, `Error at ${word}`);
  }
});
