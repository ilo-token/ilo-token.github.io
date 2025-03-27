// This code is Deno only

import { assert } from "@std/assert/assert";
import { exists } from "@std/fs/exists";
import * as ESBuild from "esbuild";
import { OPTIONS } from "./config.ts";

const BUILD_OPTIONS: ESBuild.BuildOptions = {
  ...OPTIONS,
  minify: false,
  define: { LIVE_RELOAD: "true" },
};
async function watchMain(): Promise<void> {
  const context = await ESBuild.context(BUILD_OPTIONS);
  await context.watch();
  await context.serve({ servedir: "./dist/" });
}
async function watchDictionary(): Promise<never> {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "-R=./dictionary/dictionary",
      "-W=./dictionary/dictionary.ts",
      "--no-prompt",
      "--frozen",
      "--cached-only",
      "--watch",
      "--no-clear-screen",
      "./dictionary/watch.ts",
    ],
    cwd: new URL("../", import.meta.url),
    stdout: "inherit",
    stderr: "inherit",
    stdin: "null",
  });
  const process = command.spawn();
  const status = await process.status;
  assert(!status.success);
  Deno.exit(status.code);
}
if (import.meta.main) {
  if (!await exists(new URL("../dictionary/dictionary.ts", import.meta.url))) {
    const Dictionary = await import("../dictionary/build.ts");
    await Dictionary.build();
  }
  await Promise.all([watchDictionary(), watchMain()]);
}
