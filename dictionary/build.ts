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
    if (error instanceof PositionedError && error.position != null) {
      const { position, length } = error.position;
      const end = position + length;
      // The only instance returning -1 is useful
      const startLine = source.lastIndexOf("\n", position) + 1;
      let currentLine = startLine;
      let currentPosition = position;

      while (true) {
        const index = source.indexOf("\n", currentLine);
        const nextLine = index === -1 ? source.length : index + 1;
        const line = source.slice(currentLine, nextLine).trimEnd();
        console.error(line);
        let relativeStart = currentPosition - currentLine;
        let relativeEnd = Math.min(end - currentLine, line.length);
        if (relativeEnd - relativeStart === 0) {
          if (relativeStart !== 0) {
            relativeStart--;
          }
          if (relativeEnd !== line.length) {
            relativeEnd++;
          }
        }
        console.error(
          `${" ".repeat(relativeStart)}%c${
            "^".repeat(relativeEnd - relativeStart)
          }`,
          red,
        );
        if (end <= nextLine) {
          break;
        } else {
          currentLine = currentPosition = nextLine;
        }
      }
      const line = source.slice(0, startLine).split(/\n(?!$)/).length;
      const column = position - startLine + 1;
      console.error(`    at %c${SOURCE}:${line}:${column}`, sourceStyle);
      console.error();
    }
  }
}
if (import.meta.main) {
  Deno.exitCode = await build() ? 0 : 1;
}
