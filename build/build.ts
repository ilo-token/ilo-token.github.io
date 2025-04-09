// This code is Deno only

import * as ESBuild from "esbuild";
import * as Dictionary from "../dictionary/build.ts";
import { OPTIONS } from "./config.ts";

const BUILD_OPTIONS: ESBuild.BuildOptions = {
  ...OPTIONS,
  minify: true,
  define: { LIVE_RELOAD: "false" },
};

if (import.meta.main) {
  const start = performance.now();
  await Dictionary.build();
  await ESBuild.build(BUILD_OPTIONS);
  const end = performance.now();
  // deno-lint-ignore no-console
  console.log(`Total time took: ${Math.floor(end - start)}ms`);
}
