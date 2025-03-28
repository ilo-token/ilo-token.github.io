// This code is Deno only

import { assert } from "@std/assert/assert";
import { exists } from "@std/fs/exists";
import { BuildContext, BuildOptions, context } from "esbuild";
import { OPTIONS } from "./config.ts";

const BUILD_OPTIONS: BuildOptions = {
  ...OPTIONS,
  minify: false,
  define: { LIVE_RELOAD: "true" },
};
async function watchMain(): Promise<BuildContext<BuildOptions>> {
  const buildContext = await context(BUILD_OPTIONS);
  try {
    await buildContext.watch();
    await buildContext.serve({ servedir: "./dist/" });
  } catch (error) {
    await buildContext.dispose();
    throw error;
  }
  return buildContext;
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
    await using stack = new AsyncDisposableStack();
    if (
      !await exists(new URL("../dictionary/dictionary.ts", import.meta.url))
    ) {
      const Dictionary = await import("../dictionary/build.ts");
      await Dictionary.build();
    }
    const statusCodePromise = watchDictionary();
    const context = await watchMain();
    stack.defer(async () => await context.dispose());
    statusCode = await statusCodePromise;
  }
  Deno.exit(statusCode);
}
