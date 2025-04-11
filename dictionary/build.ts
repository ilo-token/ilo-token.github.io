// This code is Deno only

// deno-lint-ignore-file no-console

import { ArrayResultError } from "../src/mod.ts";
import { PositionedError } from "../src/parser/parser_lib.ts";
import { dictionaryParser } from "./parser.ts";
import { Dictionary } from "./type.ts";

const SOURCE = new URL("./dictionary", import.meta.url);
const DESTINATION = new URL("./dictionary.ts", import.meta.url);

export async function build(): Promise<boolean> {
  console.log("Building dictionary...");
  const start = performance.now();
  const text = await Deno.readTextFile(SOURCE);
  const startDictionary = performance.now();
  const result = dictionaryParser.parse(text);
  const endDictionary = performance.now();
  let dictionary: Dictionary;
  if (!result.isError()) {
    dictionary = result.array[0];
  } else {
    displayError(text, result.errors);
    return false;
  }
  const json = JSON.stringify(
    Object.fromEntries(dictionary),
    undefined,
    2,
  );
  const code = `\
// This code is autogenerated

import { Dictionary } from "./type.ts";

export const dictionary: Dictionary = new Map(Object.entries(${json}));
`;
  await Deno.writeTextFile(DESTINATION, code);
  const end = performance.now();
  const total = Math.floor(end - start);
  const parsing = Math.floor(endDictionary - startDictionary);
  console.log(
    `Building dictionary done in ${total}ms (parsing dictionary took ${parsing}ms)`,
  );
  return true;
}
function displayError(
  source: string,
  errors: ReadonlyArray<ArrayResultError>,
): void {
  let color: boolean;
  try {
    color = Deno.env.get("NO_COLOR") !== "1";
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) {
      color = true;
    } else {
      throw error;
    }
  }
  const red = color ? "color: red" : "";
  const sourceStyle = color ? "color: blue" : "";
  for (const error of errors) {
    console.error(`%cError%c: ${error.message}`, red, "");
    if (error instanceof PositionedError) {
      const position = error.position;
      const lines = source.slice(0, position?.position).split(/\r?\n/);
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      console.error(`    at %c${SOURCE}:${line}:${column}`, sourceStyle);
      console.error();
    }
  }
}
if (import.meta.main) {
  Deno.exitCode = await build() ? 0 : 1;
}
