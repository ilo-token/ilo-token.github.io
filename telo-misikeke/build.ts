/** Build codes for telo misikeke source codes. */

import PROJECT_DATA from "../project-data.json" with { type: "json" };
import { fetchOk } from "../src/misc.ts";

const TELO_MISIKEKE_URL =
  `https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/${PROJECT_DATA.commitId.teloMisikeke}/`;
const LINKU_URL =
  `https://raw.githubusercontent.com/lipu-linku/sona/${PROJECT_DATA.commitId.sonaLinku}/api/raw/words.json`;
const LINKU_DEST = new URL("./linku-data.json", import.meta.url);
const SOURCE = [
  {
    source: new URL("./public/rules.js", TELO_MISIKEKE_URL),
    destination: new URL("./rules.js", import.meta.url),
    exportItems: [
      "getCategory",
      "getMessage",
      "rulesByCategory",
      "parseLipuLinku",
      "build_rules",
    ],
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
  const response = await fetchOk(source);
  let file = await response.text();

  // add `export`
  file = file + `;export{${exportItems.join(",")}};`;

  //write the code
  await Deno.writeTextFile(destination, file);
}
async function buildSonaLinku(): Promise<void> {
  const response = await fetchOk(LINKU_URL);
  const json = await response.json();
  const processedJson = parseLipuLinku(json);
  await Deno.writeTextFile(LINKU_DEST, JSON.stringify(processedJson));
}
function parseLipuLinku(
  data: { [word: string]: { usage_category: string } },
): [string, string][] {
  return Object.keys(data).map((word) => [word, data[word].usage_category]);
}
export async function buildTeloMisikeke(): Promise<void> {
  await Promise.all([
    buildSonaLinku(),
    ...SOURCE
      .map((file) =>
        buildCode(file.source, file.destination, file.exportItems)
      ),
  ]);
}
