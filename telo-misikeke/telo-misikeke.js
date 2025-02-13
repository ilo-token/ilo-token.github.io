/** Glue code for telo misikeke */

// @ts-self-types="./telo-misikeke.d.ts"

import { escapeHtmlWithNewline, newlineAsHtml } from "../src/misc.ts";
import LINKU from "./linku-data.json" with { type: "json" };
import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";

const RULES = build_rules(LINKU);

/** Gets all telo misikeke error messages. */
export function errors(text) {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter((token) => RULES[token.ruleName].category === "error")
    .map((token) => {
      const src = escapeHtmlWithNewline(token.text);
      const message = newlineAsHtml(getMessage(token.ruleName, token.match));
      return `"${src}" ${message}`;
    });
}
