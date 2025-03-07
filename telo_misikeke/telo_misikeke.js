// @ts-self-types="./telo_misikeke.d.ts"

import {
  escapeHtmlWithLineBreak,
  newlineAsHtmlLineBreak,
} from "../src/misc.ts";
import LINKU from "./linku_data.json" with { type: "json" };
import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";

const RULES = build_rules(LINKU);

export function errors(text) {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter((token) => RULES[token.ruleName].category === "error")
    .map((token) => {
      const src = escapeHtmlWithLineBreak(token.text);
      const message = newlineAsHtmlLineBreak(
        getMessage(token.ruleName, token.match),
      );
      return `"${src}" ${message}`;
    });
}
