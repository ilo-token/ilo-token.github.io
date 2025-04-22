// @ts-self-types="./telo_misikeke.d.ts"

import { escape } from "@std/html/entities";
import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";

let rules;

export function load(words) {
  rules = build_rules(words.map((word) => [word, "core"]));
}
export function errors(text) {
  return new ParserWithCallbacks(rules, false)
    .tokenize(text)
    .filter(({ ruleName }) => rules[ruleName].category === "error")
    .map(({ text, ruleName, match }) =>
      `"${escape(text)}" ${
        getMessage(ruleName, match).replaceAll(/\r?\n/g, "<br/>")
      }`
    );
}
