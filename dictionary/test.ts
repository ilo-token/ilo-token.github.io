import { assertMatch } from "@std/assert/match";
import { dictionary } from "./dictionary.ts";

Deno.test("definition source has leading space", () => {
  for (const [word, { src }] of dictionary) {
    assertMatch(src, /^\s/, `Error at ${word}`);
  }
});
