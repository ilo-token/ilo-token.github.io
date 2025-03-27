// This code is Deno only

import { assertNotEquals } from "@std/assert/not-equals";
import { assertThrows } from "@std/assert/throws";
import { parse } from "./parser.ts";
import { EXAMPLE_SENTENCES, MALFORMED_SENTENCES } from "../examples.ts";

Deno.test("AST all distinct", () => {
  for (const sentence of EXAMPLE_SENTENCES) {
    const pairs = uniquePairs(parse(sentence).unwrap());
    for (const [a, b] of pairs) {
      assertNotEquals(a, b, `Error at "${sentence}"`);
    }
  }
});

Deno.test("parser all error", () => {
  for (const sentence of MALFORMED_SENTENCES) {
    assertThrows(() => parse(sentence).unwrap());
  }
});

function uniquePairs<T>(
  array: ReadonlyArray<T>,
): ReadonlyArray<readonly [T, T]> {
  return array.flatMap((a, i) => array.slice(i + 1).map((b) => [a, b]));
}
