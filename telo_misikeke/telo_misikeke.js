// @ts-self-types="./telo_misikeke.d.ts"

import { escape } from "@std/html/entities";
import LINKU from "./linku_data.json" with { type: "json" };
import { ParserWithCallbacks } from "./Parser.js";
import { build_rules, getMessage } from "./rules.js";

const RULES = build_rules(LINKU);

export function errors(text) {
  return new ParserWithCallbacks(RULES, false)
    .tokenize(text)
    .filter(({ ruleName }) => RULES[ruleName].category === "error")
    .map(({ text, ruleName, match }) =>
      `"${escape(text)}" ${
        getMessage(ruleName, match).replaceAll(/\r?\n/g, "<br/>")
      }`
    );
}
