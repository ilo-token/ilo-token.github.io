import { bundle, BundleOptions } from "@deno/emit";
import { buildTeloMisikeke } from "telo-misikeke/build.ts";
import { buildDictionary } from "dictionary/build.ts";
import { fs } from "./src/misc.ts";

const SOURCE = new URL("./src/main.ts", import.meta.url);
const DESTINATION = new URL("./dist/main.js", import.meta.url);
const IMPORT_MAP = new URL("./deno.json", import.meta.url);

const buildOption: BundleOptions = {
  compilerOptions: { inlineSourceMap: true },
  type: "classic",
  importMap: IMPORT_MAP,
};
async function build() {
  console.log("Building main.js...");
  const bundled = await bundle(SOURCE, buildOption);
  const useStrict = addUseStrict(bundled.code);
  await Deno.writeTextFile(DESTINATION, useStrict);
  console.log("Building done!");
}
switch (Deno.args[0]) {
  case "build": {
    console.log("Building telo misikeke...");
    await buildTeloMisikeke();
    console.log("Building dictionary...");
    if (!await buildDictionary()) {
      break;
    }
    await build();
    break;
  }
  case "watch": {
    const builder = debounce(async () => {
      try {
        await build();
      } catch (error) {
        console.error(error);
      }
    }, 500);
    const watcher = Deno.watchFs([
      "./src/",
      "./telo-misikeke/",
      "./dictionary/",
    ]);
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
    throw new Error(fs`Unrecognized build option, ${Deno.args[0]}`);
}
function addUseStrict(src: string): string {
  return src.replace(/\(\s*function\s*\(\s*\)\s*\{/, '$&"use strict";');
}
function debounce(callback: () => Promise<void>, delay: number): () => void {
  let previous = { aborted: true };
  let current = Promise.resolve();
  return () => {
    previous.aborted = true;
    const newPrevious = { aborted: false };
    setTimeout(() => {
      if (!newPrevious.aborted) {
        current = current
          .then(() => callback())
          .catch((error) => {
            throw error;
          });
      }
    }, delay);
    previous = newPrevious;
  };
}
