/** Build codes for telo misikeke source codes. */

import { fs, join } from "../src/misc.ts";

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
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(
      fs`unable to fetch ${source} (${`${response.status}`} ${response.statusText})`,
    );
  }
  let file = await response.text();

  // add fs`export`
  file = file + fs`;export{${join(exportItems, ",")}};`;

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
