import { assertArrayIncludes } from "@std/assert/array-includes";
import { translate } from "./translator.ts";

Deno.test("verb with adverb", () => {
  const translations = translate("mi toki pona").unwrap();
  assertArrayIncludes(translations, ["I nicely communicate"]);
});
