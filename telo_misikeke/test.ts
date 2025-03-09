import { assert } from "@std/assert/assert";
import { MALFORMED_SENTENCES } from "../src/examples.ts";
import { errors } from "./telo_misikeke.js";

Deno.test("telo misikeke", () => {
  for (const sentence of MALFORMED_SENTENCES) {
    assert(errors(sentence).length > 0, `Error at "${sentence}"`);
  }
});
