import { translate } from "./composer.ts";

while (true) {
  const input = prompt("> ");
  if (input == null) {
    break;
  }
  const output = translate(input);
  if (output.isError()) {
    for (const error of output.errors) {
      console.error(error.message);
    }
  } else {
    for (const translation of output.output) {
      console.log(`  - ${translation}`);
    }
  }
}
