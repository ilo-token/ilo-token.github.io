import * as Dictionary from "./dictionary/build.ts";
import { debounce } from "./src/misc.ts";
import * as ESBuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const WATCH = [
  "./dictionary/dictionary",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo-misikeke/linku-data.json",
  "./telo-misikeke/Parser.js",
  "./telo-misikeke/rules.js",
  "./telo-misikeke/telo-misikeke.js",
  "./src/",
  "./project-data.json",
];
const DICTIONARY = /dictionary$/;

function buildOptions(minify: boolean): ESBuild.BuildOptions {
  return {
    entryPoints: ["./src/main.ts"],
    outfile: "./dist/main.js",
    format: "iife",
    bundle: true,
    minify,
    sourcemap: "linked",
    plugins: [...denoPlugins()],
  };
}
async function buildAll(options: {
  minify: boolean;
  buildDictionary: boolean;
}): Promise<void> {
  const { minify, buildDictionary } = options;
  try {
    if (buildDictionary) {
      await Dictionary.build();
    }
    console.log("Building main.js...");
    await ESBuild.build(buildOptions(minify));
    console.log("Building done!");
  } catch (error) {
    console.error(error);
  }
}
if (import.meta.main) {
  switch (Deno.args[0]) {
    case "build": {
      await buildAll({ minify: true, buildDictionary: true });
      break;
    }
    case "watch": {
      console.log("Press ctrl+c to exit.");
      const watcher = Deno.watchFs(WATCH);
      try {
        await buildAll({ minify: false, buildDictionary: true });
        let dictionaryChanged = false;
        const buildDebounced = debounce(async (buildDictionary: boolean) => {
          await buildAll({ minify: true, buildDictionary });
          dictionaryChanged = false;
        }, 500);
        for await (const event of watcher) {
          if (event.paths.some((path) => DICTIONARY.test(path))) {
            dictionaryChanged = true;
          }
          buildDebounced(dictionaryChanged);
        }
        throw new Error("unreachable");
      } finally {
        watcher.close();
      }
    }
    default:
      throw new Error(`unrecognized build option: ${Deno.args[0]}`);
  }
}
