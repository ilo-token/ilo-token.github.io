import { buildTeloMisikeke } from "./telo-misikeke/build.ts";
import { buildDictionary } from "./dictionary/build.ts";
import { debounce } from "./src/misc.ts";
import { build } from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const WATCH = [
  "./dictionary/build.ts",
  "./dictionary/dictionary",
  "./dictionary/parser.ts",
  "./dictionary/type.ts",
  "./telo-misikeke/telo-misikeke.js",
  "./src/",
  "./project-data.json",
];
async function buildIloToken(minify: boolean): Promise<void> {
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
if (import.meta.main) {
  switch (Deno.args[0]) {
    case "build": {
      console.log("Building dictionary and telo misikeke...");
      await Promise.all([buildDictionary(), buildTeloMisikeke()]);
      await buildIloToken(true);
      break;
    }
    case "watch": {
      console.log("Press ctrl+c to exit.");
      const builder = debounce(async () => {
        try {
          console.log("Building dictionary...");
          await buildDictionary();
          await buildIloToken(false);
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
