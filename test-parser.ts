import { OutputError } from "./src/error.ts";
import { parser } from "./src/parser.ts";

const input = await Deno.readTextFile("./test.txt");
console.log(
  JSON.stringify(parser(input), (key, value) => {
    if (key === "error") {
      return (value as null | OutputError)?.message;
    } else {
      return value;
    }
  }, 2),
);
