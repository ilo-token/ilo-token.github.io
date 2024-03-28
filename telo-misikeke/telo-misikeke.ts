/** Glue code for telo misikeke */

import { ParserWithCallbacks } from "./Parser.js";
import { build_rules } from "./rules.js";
import { DATA } from "./linku-data.ts";

// deno-lint-ignore no-explicit-any
const RULES: any = build_rules(DATA);

/** Gets all telo misikeke error messages. */
export function errors(text: string): Array<string> {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter((token) => RULES[token.ruleName].category === "error")
    .map((token) => `"${token.text}" ${RULES[token.ruleName].message}`);
}
