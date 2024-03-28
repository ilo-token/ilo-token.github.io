/** Build codes for telo misikeke source codes. */

/** */
const SOURCE = [
  [
    "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/public/rules.js?ref_type=heads&inline=false",
    "./rules.js",
    "build_rules",
  ],
  [
    "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/public/Parser.js?ref_type=heads&inline=false",
    "./Parser.js",
    "ParserWithCallbacks",
  ],
] as const;
async function buildFile(
  source: string,
  destination: string,
  exportItem: string,
): Promise<void> {
  // fetch source code
  let file = await (await fetch(source)).text();

  // add `export` keyword
  file = file.replace(
    new RegExp(`function\\s+${exportItem}`),
    `export function ${exportItem}`,
  );

  // remove module.export
  const seachText = "if ( typeof ( module ) != 'undefined' )";
  const regex = new RegExp(
    seachText.replaceAll(/[()]/g, "\\$&").replaceAll(" ", "\\s*") + "[^]*$",
  );
  file = file.replace(regex, "");

  //write the code
  await Deno.writeTextFile(new URL(destination, import.meta.url), file);
}
export async function build(): Promise<void> {
  await Promise.all(
    SOURCE.map(([source, destination, exportItem]) =>
      buildFile(source, destination, exportItem)
    ),
  );
}
