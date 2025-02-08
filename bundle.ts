import { buildDictionary } from "./dictionary/build.ts";
import { debounce } from "./src/misc.ts";
import { build } from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const WATCH = [
  "./dictionary/dictionary",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo-misikeke/telo-misikeke.js",
  "./src/",
  "./project-data.json",
];
async function buildIloToken(minify: boolean): Promise<void> {
  console.log("Building dictionary...");
  await buildDictionary();
  console.log("Building main.js...");
  await build({
    entryPoints: ["./src/main.ts"],
    outfile: "./dist/main.js",
    format: "iife",
    bundle: true,
    minify,
    sourcemap: "linked",
    plugins: [...denoPlugins()],
  });
  console.log("Building done!");
}
async function buildLogError(): Promise<void> {
  try {
    await buildIloToken(false);
  } catch (error) {
    console.error(error);
  }
}
const buildDebounced = debounce(buildLogError, 500);
if (import.meta.main) {
  switch (Deno.args[0]) {
    case "build": {
      await buildIloToken(true);
      break;
    }
    case "watch": {
      console.log("Press ctrl+c to exit.");
      await buildLogError();
      const watcher = Deno.watchFs(WATCH);
      for await (const _ of watcher) {
        buildDebounced();
      }
      throw new Error("unreachable");
    }
    default:
      throw new Error(`unrecognized build option: ${Deno.args[0]}`);
  }
}
