/** Build codes for telo misikeke source codes. */

/** */
const SOURCE = [
  {
    source:
      "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/public/rules.js?ref_type=heads&inline=false",
    destination: new URL("./rules.js", import.meta.url),
    exportItems: ["build_rules", "getMessage"],
  },
  {
    source:
      "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/public/Parser.js?ref_type=heads&inline=false",
    destination: new URL("./Parser.js", import.meta.url),
    exportItems: ["ParserWithCallbacks"],
  },
];
async function buildFile(
  source: string,
  destination: URL,
  exportItems: Array<string>,
): Promise<void> {
  // fetch source code
  let file = await (await fetch(source)).text();

  // add `export`
  file = file + `export{${exportItems.join(",")}};`;

  //write the code
  await Deno.writeTextFile(destination, file);
}
export async function buildTeloMisikeke(): Promise<void> {
  await Promise.all(
    SOURCE
      .map((file) =>
        buildFile(file.source, file.destination, file.exportItems)
      ),
  );
}
