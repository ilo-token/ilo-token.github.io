// this code is Deno only

import { unreachable } from "@std/assert/unreachable";
import { debounce } from "@std/async/debounce";
import { build } from "./build.ts";

if (import.meta.main) {
  await using stack = new AsyncDisposableStack();
  using watcher = Deno.watchFs("./dictionary/dictionary");
  let task = Promise.resolve();
  stack.defer(async () => await task);
  const buildDebounced = debounce(() => {
    task = task.then(async () => {
      await build();
    });
  }, 200);
  buildDebounced();
  buildDebounced.flush();
  for await (const _ of watcher) {
    buildDebounced();
  }
  unreachable();
}
