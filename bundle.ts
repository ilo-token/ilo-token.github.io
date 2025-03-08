import { denoPlugins } from "@luca/esbuild-deno-loader";
import { debounce } from "@std/async/debounce";
import * as ESBuild from "esbuild";

const WATCH = [
  "./dictionary/build.ts",
  "./dictionary/dictionary",
  "./dictionary/misc.ts",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo_misikeke/linku-data.json",
  "./telo_misikeke/Parser.js",
  "./telo_misikeke/rules.js",
  "./telo_misikeke/telo-misikeke.js",
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
    target: [`es${new Date().getFullYear() - 3}`],
    plugins: [...denoPlugins()],
  };
}
async function buildAll(
  options: Readonly<{
    minify: boolean;
    buildDictionary: boolean;
    checkDictionary?: boolean;
  }>,
): Promise<void> {
  const { minify, buildDictionary, checkDictionary } = options;
  try {
    if (buildDictionary) {
      const Dictionary = await import("./dictionary/build.ts");
      await Dictionary.build(checkDictionary ?? true);
    }
    // deno-lint-ignore no-console
    console.log("Building main.js...");
    await ESBuild.build(buildOptions(minify));
    // deno-lint-ignore no-console
    console.log("Building done!");
  } catch (error) {
    // deno-lint-ignore no-console
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
      // deno-lint-ignore no-console
      console.log("Press ctrl+c to exit.");
      const watcher = Deno.watchFs(WATCH);
      let task = Promise.resolve();
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
    }
    default:
      throw new Error(`unrecognized build option: ${Deno.args[0]}`);
  }
}
