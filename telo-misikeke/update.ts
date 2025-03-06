import { retry } from "@std/async/retry";
import { assertOk } from "../src/misc.ts";

const TELO_MISIKEKE_URL =
  "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/";
const LINKU_URL = "https://api.linku.la/v1/words";
const LINKU_DESTINATION = new URL("./linku-data.json", import.meta.url);
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
const COMMONJS_EXPORT =
  /\s*if\s*\(\s*typeof\s*\(\s*module\s*\)\s*!=\s*(["'`])undefined\1\s*\)\s*\{\s*module\s*\.\s*exports\s*=\s*\{\s*[^}]*\}\s*;?\s*\}\s*/g;
async function buildCode(
  source: URL,
  destination: URL,
  exportItems: ReadonlyArray<string>,
): Promise<void> {
  const response = assertOk(await retry(() => fetch(source)));
  const rawCode = await response.text();
  const withoutCjs = rawCode.replaceAll(COMMONJS_EXPORT, "");
  if (withoutCjs.includes("module.exports")) {
    throw new Error(`unable to remove CommonJS exports on ${destination}`);
  }
  const exports = exportItems.join(", ");
  const code = `\
// This code is from ${source}
//
// Repository: https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/
// Copyright (c) 2023 Nicolas Hurtubise
// MIT License https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/#licence
//
// It is automatically modified to be an ES module

${withoutCjs};
export { ${exports} };
`;
  await Deno.writeTextFile(destination, code);
}
async function buildSonaLinku(): Promise<void> {
  const response = assertOk(await retry(() => fetch(LINKU_URL)));
  const json = await response.json();
  await Deno.writeTextFile(
    LINKU_DESTINATION,
    `${JSON.stringify(parseLipuLinku(json), undefined, 2)}\n`,
  );
}
function parseLipuLinku(
  data: { [word: string]: { usage_category: string } },
): ReadonlyArray<readonly [word: string, usage: string]> {
  return Object.entries(data)
    .map<readonly [word: string, usage: string]>(
      ([word, data]) => [word, data.usage_category],
    )
    .filter(([_, category]) => category !== "sandbox");
}
if (import.meta.main) {
  await Promise.all([
    buildSonaLinku(),
    ...SOURCE
      .map((file) =>
        buildCode(file.source, file.destination, file.exportItems)
      ),
  ]);
  console.log("Updated telo misikeke.");
}
