import { bundle } from "@deno/emit";
import { buildTeloMisikeke } from "telo-misikeke/build.ts";
import { buildDictionary } from "dictionary/build.ts";

const SOURCE = new URL("./src/main.ts", import.meta.url);
const DESTINATION = new URL("./dist/main.js", import.meta.url);
const IMPORT_MAP = new URL("./deno.json", import.meta.url);

switch (Deno.args[0]) {
  case "build": {
    console.log("Building telo misikeke...");
    await buildTeloMisikeke();
    console.log("Building dictionary");
    if (!buildDictionary) {
      break;
    }
    console.log("Building main.js...");
    const bundled = await bundle(SOURCE, {
      type: "classic",
      importMap: IMPORT_MAP,
    });
    const useStrict = addUseStrict(bundled.code);
    const { stop, transform } = await import("esbuild");
    const minified = await transform(useStrict, { minify: true });
    await stop();
    await Deno.writeTextFile(DESTINATION, minified.code);
    console.log("Building done!");
    break;
  }
  case "watch": {
    const builder = debounce(async () => {
      console.log("Starting to build...");
      try {
        const { code } = await bundle(SOURCE, {
          compilerOptions: { inlineSourceMap: true },
          type: "classic",
          importMap: IMPORT_MAP,
        });
        const useStrict = addUseStrict(code);
        await Deno.writeTextFile(DESTINATION, useStrict);
        console.log("Building done!");
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
    throw new Error(`Unrecognized build option, ${Deno.args[0]}`);
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
