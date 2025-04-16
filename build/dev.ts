// This code is Deno only

import { assert } from "@std/assert/assert";
import { exists } from "@std/fs/exists";
import { BuildOptions, context } from "esbuild";
import { OPTIONS } from "./config.ts";

const DICTIONARY = new URL("../dictionary/dictionary.ts", import.meta.url);

const BUILD_OPTIONS: BuildOptions = {
  ...OPTIONS,
  minify: false,
  define: { LIVE_RELOAD: "true" },
};
async function watchMain(): Promise<AsyncDisposable> {
  await using stack = new AsyncDisposableStack();
  const buildContext = stack.use({
    context: await context(BUILD_OPTIONS),
    async [Symbol.asyncDispose](): Promise<void> {
      await this.context.dispose();
    },
  });
  buildContext.context.watch();
  buildContext.context.serve({ servedir: "./dist/" });
  stack.move();
  return buildContext;
}
async function watchDictionary(): Promise<number> {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "-E=NO_COLOR",
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
  return status.code;
}
if (import.meta.main) {
  if (!await exists(DICTIONARY)) {
    await Deno.create(DICTIONARY);
  }
  const statusCodePromise = watchDictionary();
  await using _ = await watchMain();
  Deno.exitCode = await statusCodePromise;
}
