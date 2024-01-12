import { parser } from "./src/parser.ts";

const input = await Deno.readTextFile("./test.txt");
console.log(JSON.stringify(parser(input), null, 2));
