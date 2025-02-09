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
      const output = translate(input);
      for (const translation of output) {
        console.log(`  - ${translation}`);
      }
    } catch (error) {
      console.error(error);
    }
  }
}
