// This code is Deno only

import { unreachable } from "@std/assert/unreachable";
import { debounce } from "@std/async/debounce";
import { build } from "./build.ts";

async function tryBuild(): Promise<void> {
  try {
    await build();
  } catch (error) {
    console.log(error);
  }
}
if (import.meta.main) {
  const watcher = Deno.watchFs("./dictionary/dictionary");
  let task = Promise.resolve();
  const buildDebounced = debounce(() => {
    task = task.then(tryBuild);
  }, 500);
  buildDebounced();
  buildDebounced.flush();
  for await (const _ of watcher) {
    buildDebounced();
  }
  unreachable();
}
