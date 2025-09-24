// this code is Deno only

import { unescape } from "@std/html/entities";
import entityList from "@std/html/named-entity-list.json" with { type: "json" };
import { repeatArray } from "../misc/misc.ts";
import { translate } from "./translator/translator.ts";

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
    const iterableResult = translate(input);
    let errorHeaderShown = false;
    for (const result of iterableResult.iterable()) {
      switch (result.type) {
        case "value": {
          const { value: translation } = result;
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
          break;
        }
        case "error": {
          if (!errorHeaderShown) {
            // deno-lint-ignore no-console
            console.error("Errors have occurred:");
            errorHeaderShown = true;
          }
          // deno-lint-ignore no-console
          console.error(`- ${result.error.message}`);
        }
      }
    }
  }
}
