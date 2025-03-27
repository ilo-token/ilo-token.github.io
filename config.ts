// This code is Deno only

import { denoPlugins } from "@luca/esbuild-deno-loader";
import * as ESBuild from "esbuild";

export const OPTIONS: ESBuild.BuildOptions = {
  entryPoints: ["./src/main.ts"],
  outfile: "./dist/main.js",
  format: "iife",
  bundle: true,
  sourcemap: "linked",
  target: [`es${new Date().getFullYear() - 3}`],
  plugins: [...denoPlugins()],
  logLevel: "info",
};
