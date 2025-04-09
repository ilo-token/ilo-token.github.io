// This code is Deno only

import { retry } from "@std/async/retry";

const TELO_MISIKEKE_URL =
  "https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/";
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
if (import.meta.main) {
  await Promise.all(
    SOURCE
      .map(({ source, destination, exportItems }) =>
        buildCode(source, destination, exportItems)
      ),
  );
  // deno-lint-ignore no-console
  console.log("Updated telo misikeke.");
}
function assertOk(response: Response): Response {
  if (!response.ok) {
    const { url, status, statusText } = response;
    throw new Error(
      `unable to fetch ${url} (${status} ${statusText})`,
    );
  } else {
    return response;
  }
}
