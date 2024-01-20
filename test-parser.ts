import { OutputError } from "./src/error.ts";
import { parser } from "./src/parser.ts";

const input = await Deno.readTextFile("./test.txt");
const output = parser(input);
console.log(JSON.stringify(output, (key, value) => {
  if (key === "error") return (value as null | OutputError)?.message;
  else return value;
}, 2));
console.log(`The output has ${output.output.length} AST's`);
