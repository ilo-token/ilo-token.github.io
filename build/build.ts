// This code is Deno only

import * as ESBuild from "esbuild";
import { OPTIONS } from "./config.ts";
import * as Dictionary from "../dictionary/build.ts";

const BUILD_OPTIONS: ESBuild.BuildOptions = { ...OPTIONS, minify: true };

if (import.meta.main) {
  await Dictionary.build();
  await ESBuild.build(BUILD_OPTIONS);
}
