// This code is Deno only

import { assertEquals } from "@std/assert/equals";
import { assertLess } from "@std/assert/less";
import { assertNotEquals } from "@std/assert/not-equals";
import { assertThrows } from "@std/assert/throws";
import { EXAMPLE_SENTENCES, MALFORMED_SENTENCES } from "../examples.ts";
import { parser } from "./parser.ts";
import { all, end, many, match, matchString, sequence } from "./parser_lib.ts";
import { KU_LILI, KU_SULI, PU } from "./ucsur.ts";

Deno.test("AST all distinct", () => {
  for (const sentence of EXAMPLE_SENTENCES) {
    const pairs = uniquePairs(parser.parse(sentence).unwrap());
    for (const [a, b] of pairs) {
      assertNotEquals(a, b, `Error at "${sentence}"`);
    }
  }
});

Deno.test("parser all error", () => {
  for (const sentence of MALFORMED_SENTENCES) {
    assertThrows(() => parser.parse(sentence).unwrap());
  }
});

Deno.test("ucsur have proper length", () => {
  assertEquals(PU.length, 120);
  assertEquals(KU_SULI.length, 17);
  assertEquals(KU_LILI.length, 4);
});

Deno.test("ucsur ordered", () => {
  for (const [i, word] of PU.entries()) {
    if (i < PU.length - 1) {
      const other = PU[i + 1];
      assertLess(word, PU[i + 1], `error between ${word} and ${other}`);
    }
  }
});

Deno.test("no ali", () => {
  for (const word of PU) {
    assertNotEquals(word, "ali");
  }
});

function uniquePairs<T>(
  array: ReadonlyArray<T>,
): ReadonlyArray<readonly [T, T]> {
  return array.flatMap((a, i) => array.slice(i + 1).map((b) => [a, b]));
}

Deno.test("small parser", () => {
  const space = match(/\s*/, "space");
  const parser = sequence(
    match(/toki/, '"toki"').skip(space),
    matchString("pona").skip(space),
    match(/a/, '"a"').skip(end),
  );
  assertEquals(parser.parse("toki pona a").unwrap(), [["toki", "pona", "a"]]);
});

Deno.test("many", () => {
  const space = match(/\s*/, "space");
  const parser = many(matchString("a").skip(space)).skip(end);
  assertEquals(parser.parse("a a a").unwrap(), [["a", "a", "a"]]);
});

Deno.test("all", () => {
  const space = match(/\s*/, "space");
  const parser = all(matchString("a").skip(space)).skip(end);
  assertEquals(parser.parse("a a a").unwrap(), [["a", "a", "a"]]);
});
