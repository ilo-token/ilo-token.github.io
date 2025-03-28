// This code is Deno only

import { assert } from "@std/assert/assert";
import { exists } from "@std/fs/exists";
import { BuildOptions, context } from "esbuild";
import { AsyncDisposableStack } from "../misc/async_disposable_stack.ts";
import { OPTIONS } from "./config.ts";

const BUILD_OPTIONS: BuildOptions = {
  ...OPTIONS,
  minify: false,
  define: { LIVE_RELOAD: "true" },
};
async function watchMain(): Promise<AsyncDisposable> {
  await using stack = new AsyncDisposableStack();
  const buildContext = await context(BUILD_OPTIONS);
  stack.defer(async () => await buildContext.dispose());
  buildContext.watch();
  buildContext.serve({ servedir: "./dist/" });
  return stack.move();
}
async function watchDictionary(): Promise<number> {
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
  return status.code;
}
if (import.meta.main) {
  let statusCode: number;
  {
    if (
      !await exists(new URL("../dictionary/dictionary.ts", import.meta.url))
    ) {
      const Dictionary = await import("../dictionary/build.ts");
      await Dictionary.build();
    }
    const statusCodePromise = watchDictionary();
    await using _ = await watchMain();
    statusCode = await statusCodePromise;
  }
  Deno.exit(statusCode);
}
