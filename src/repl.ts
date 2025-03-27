// This code is Deno only

import { unescape } from "@std/html/entities";
import entityList from "@std/html/named-entity-list.json" with { type: "json" };
import { repeatArray } from "../misc/misc.ts";
import { translate } from "./mod.ts";

if (import.meta.main) {
  // deno-lint-ignore no-console
  console.log(
    "Welcome to the ilo Token REPL. Press ctrl+d or ctrl+c to exit.",
  );
  while (true) {
    const input = prompt(">");
    if (input == null) {
      break;
    }
    try {
      const arrayResult = translate(input);
      for (const translation of arrayResult) {
        const count = translation.match(/<strong>/g)?.length ?? 0;
        const text = unescape(
          translation.replaceAll(/<\/?strong>/g, "%c"),
          { entityList },
        );
        // deno-lint-ignore no-console
        console.log(
          `  - ${text}`,
          ...repeatArray(["font-weight: bold", ""], count).flat(),
        );
      }
    } catch (error) {
      // deno-lint-ignore no-console
      console.error(error);
    }
  }
}
