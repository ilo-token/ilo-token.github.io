// this code is Deno only

import { denoPlugins } from "@luca/esbuild-deno-loader";
import { BuildOptions } from "esbuild";

export const OPTIONS: BuildOptions = {
  entryPoints: ["./src/main.ts"],
  outfile: "./dist/main.js",
  bundle: true,
  sourcemap: "linked",
  target: [`es${new Date().getFullYear() - 3}`],
  plugins: [...denoPlugins()],
  logLevel: "info",
};
