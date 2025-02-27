import { denoPlugins } from "@luca/esbuild-deno-loader";
import { debounce } from "@std/async/debounce";
import * as ESBuild from "esbuild";

const WATCH = [
  "./dictionary/build.ts",
  "./dictionary/dictionary",
  "./dictionary/misc.ts",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo-misikeke/linku-data.json",
  "./telo-misikeke/Parser.js",
  "./telo-misikeke/rules.js",
  "./telo-misikeke/telo-misikeke.js",
  "./src/",
  "./project-data.json",
];
const DICTIONARY = /dictionary[/\\][^/\\]+$/;

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
  checkDictionary?: boolean;
}): Promise<void> {
  const { minify, buildDictionary, checkDictionary } = options;
  try {
    if (buildDictionary) {
      const Dictionary = await import("./dictionary/build.ts");
      await Dictionary.build(checkDictionary ?? true);
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
      let task = Promise.resolve();
      try {
        await buildAll({ minify: false, buildDictionary: true });
        let dictionaryChanged = false;
        const buildDebounced = debounce((buildDictionary: boolean) => {
          task = task.then(async () => {
            await buildAll({
              minify: false,
              buildDictionary,
              checkDictionary: false,
            });
            dictionaryChanged = false;
          });
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
        await task;
      }
    }
    default:
      throw new Error(`unrecognized build option: ${Deno.args[0]}`);
  }
}
