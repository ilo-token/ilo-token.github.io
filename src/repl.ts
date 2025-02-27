import { unescape } from "@std/html/entities";
import entityList from "@std/html/named-entity-list.json" with { type: "json" };
import { repeatArray } from "./misc.ts";
import { translate } from "./mod.ts";

if (import.meta.main) {
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
        const text = unescape(translation.replaceAll(/<\/?strong>/g, "%c"), {
          entityList,
        });
        console.log(
          `  - ${text}`,
          ...repeatArray(["font-weight: bold", ""], count).flat(),
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
}
