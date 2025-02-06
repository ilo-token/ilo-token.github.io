import { bundle, BundleOptions } from "@deno/emit";
import { buildTeloMisikeke } from "./telo-misikeke/build.ts";
import { buildDictionary } from "./dictionary/build.ts";
import { debounce } from "./src/misc.ts";

const SOURCE = new URL("./src/main.ts", import.meta.url);
const DESTINATION = new URL("./dist/main.js", import.meta.url);
const IMPORT_MAP = new URL("./bundle-imports.json", import.meta.url);

const BUILD_OPTION: BundleOptions = {
  type: "classic",
  importMap: IMPORT_MAP,
};
const WATCH = [
  "./dictionary/build.ts",
  "./dictionary/dictionary",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo-misikeke/telo-misikeke.js",
  "./src/",
  "./project-data.json",
];
async function build(): Promise<void> {
  console.log("Building dictionary...");
  await buildDictionary();
  console.log("Building main.js...");
  const bundled = await bundle(SOURCE, BUILD_OPTION);
  const withUseStrict = bundled.code
    .replace(/\(\s*function\s*\(\s*\)\s*\{/, '$&"use strict";');
  await Deno.writeTextFile(DESTINATION, withUseStrict);
  console.log("Building done!");
}
if (import.meta.main) {
  switch (Deno.args[0]) {
    case "build": {
      console.log("Building telo misikeke...");
      await buildTeloMisikeke();
      await build();
      break;
    }
    case "watch": {
      console.log("Press ctrl+c to exit.");
      const builder = debounce(async () => {
        try {
          await build();
        } catch (error) {
          console.error(error);
        }
      }, 500);
      const watcher = Deno.watchFs(WATCH);
      Deno.addSignalListener("SIGINT", () => {
        watcher.close();
        Deno.exit();
      });
      try {
        builder();
        for await (const _ of watcher) {
          builder();
        }
      } finally {
        watcher.close();
      }
      throw new Error("unreachable");
    }
    default:
      throw new Error(`unrecognized build option: ${Deno.args[0]}`);
  }
}
