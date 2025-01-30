import { parseDictionary } from "./parser.ts";

const SOURCE = new URL("./dictionary", import.meta.url);
const DESTINATION = new URL("./dictionary.ts", import.meta.url);

export async function buildDictionary(): Promise<void> {
  const text = await Deno.readTextFile(SOURCE);
  const dictionary = parseDictionary(text);
  if (dictionary.isError()) {
    throw new AggregateError(dictionary.errors);
  }
  await Deno.writeTextFile(
    DESTINATION,
    `import{Dictionary}from"./type.ts";export const dictionary:Dictionary=${
      JSON.stringify(dictionary.output[0])
    }`,
  );
}
