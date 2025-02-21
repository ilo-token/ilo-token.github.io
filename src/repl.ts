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
        console.log(
          `  - ${translation.replaceAll(/<\/?strong>/g, "%c")}`,
          ...repeatArray(["font-weight: bold", ""], count).flat(),
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
}
