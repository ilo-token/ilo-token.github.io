import { translate } from "./mod.ts";

while (true) {
  const input = prompt("> ");
  if (input == null) {
    break;
  }
  const output = translate(input);
  for (const translation of output) {
    console.log(`  - ${translation}`);
  }
}
