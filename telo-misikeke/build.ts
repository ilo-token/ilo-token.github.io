/** Build codes for telo misikeke source codes. */

/** */
const COMMIT_ID = "c61987ed2ff7b4319b20960c596570f016755fb4";
const TELO_MISIKEKE_URL =
  `https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/${COMMIT_ID}/`;
const SOURCE = [
  {
    source: new URL("./public/rules.js", TELO_MISIKEKE_URL),
    destination: new URL("./rules.js", import.meta.url),
    exportItems: ["build_rules", "getMessage", "parseLipuLinku"],
  },
  {
    source: new URL("./public/Parser.js", TELO_MISIKEKE_URL),
    destination: new URL("./Parser.js", import.meta.url),
    exportItems: ["ParserWithCallbacks"],
  },
];
async function buildCode(
  source: URL,
  destination: URL,
  exportItems: Array<string>,
): Promise<void> {
  // fetch source code
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(
      `unable to fetch ${source} (${response.status} ${response.statusText})`,
    );
  }
  let file = await response.text();

  // add `export`
  file = file + `;export{${exportItems.join(",")}};`;

  //write the code
  await Deno.writeTextFile(destination, file);
}
export async function buildTeloMisikeke(): Promise<void> {
  await Promise.all(
    SOURCE
      .map((file) =>
        buildCode(file.source, file.destination, file.exportItems)
      ),
  );
}
