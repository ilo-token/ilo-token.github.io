/** Glue code for telo misikeke */

import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";
import LINKU from "./linku-data.json" with { type: "json" };
import { escapeHtml } from "../src/misc.ts";

const RULES = build_rules(LINKU);

/** Gets all telo misikeke error messages. */
export function errors(text) {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter((token) => RULES[token.ruleName].category === "error")
    .map((token) => {
      const src = escapeHtml(token.text);
      const message = getMessage(token.ruleName, token.match)
        .replace(/\n/g, "<br>");
      return `"${src}" ${message}`;
    });
}
