import { randomPhrase } from "./fuzzer.ts";
import { parser } from "./parser.ts";

const timeStart = +new Date();
const duration = 10 * 1000;
let count = 0;

while (+new Date() < timeStart + duration) {
  const words = randomPhrase();
  if (words.length > 10) continue;
  const src = words.join(" ");
  const set = new Set<string>();
  for (const ast of parser(src).output) {
    const json = JSON.stringify(ast);
    if (set.has(json)) {
      throw new Error(`Duplicate found when parsing "${src}".`);
    } else {
      set.add(json);
    }
  }
  count++;
}
console.log(`Tested ${count} random sentences.`);
