// This code is Deno only

import { assertArrayIncludes } from "@std/assert/array-includes";
import { number } from "./number.ts";
import { translate } from "./translator.ts";

Deno.test("verb with adverb", () => {
  const translations = translate("mi toki pona").unwrap();
  assertArrayIncludes(translations, ["I nicely communicate"]);
});
Deno.test("adjective with adverb", () => {
  const translations = translate("pona ike").unwrap();
  assertArrayIncludes(translations, ["Badly good"]);
});
Deno.test("numeral translation", () => {
  const NUMBER_TESTS = new Map(Object.entries({
    "tu tu tu wan": 7,
    "luka tu": 7,
    "mute mute mute luka luka luka tu wan": 78,
    "wan": 1,
    "tu": 2,
    "tu wan": 3,
    "tu tu": 4,
    "luka": 5,
    "tu tu wan": 5,
    "luka wan": 6,
    "mute": 20,
    "luka luka luka luka": 20,
    "mute luka luka luka wan": 36,
    "ale": 100,
    "mute mute mute mute mute": 100,
    "ale ale ale": 300,
    "wan ale": 100,
    "tu wan ale": 300,
    "luka luka ale": 1000,
    "wan ale ale": 10000,
    "mute ale mute tu tu": 2024,
  }));
  for (const [tokiPona, expected] of NUMBER_TESTS) {
    const numbers = number(tokiPona.trim().split(" ")).unwrap();
    assertArrayIncludes(numbers, [expected], `Error at "${tokiPona}"`);
  }
});
