const SOURCE = new URL("./dictionary", import.meta.url);
const DESTINATION = new URL("./dictionary.ts", import.meta.url);

// While we still don't have `import ... with { type: "txt" }`, we'll have to
// do this
export async function buildDictionary(): Promise<void> {
  const text = await Deno.readTextFile(SOURCE);
  await Deno.writeTextFile(
    DESTINATION,
    `export const dictionary=${JSON.stringify(text)}`,
  );
}
