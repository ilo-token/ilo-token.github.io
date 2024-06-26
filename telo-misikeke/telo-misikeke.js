/** Glue code for telo misikeke */

import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";
import { DATA } from "./linku-data.js";

const RULES = build_rules(DATA);

/** Gets all telo misikeke error messages. */
export function errors(text) {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter((token) => RULES[token.ruleName].category === "error")
    .map((token) => {
      const src = token.text
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("&", "&amp;");
      const message = getMessage(token.ruleName, token.match)
        .replace(/\n/g, "<br>");
      return `"${src}" ${message}`;
    });
}
