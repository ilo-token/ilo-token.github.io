// this code is Deno only

import { unreachable } from "@std/assert/unreachable";
import { debounce } from "@std/async/debounce";
import { build } from "./build.ts";
import { Parser } from "./parallel_parser.ts";

if (import.meta.main) {
  await using stack = new AsyncDisposableStack();
  using watcher = Deno.watchFs("./dictionary.txt");
  using parser = new Parser();
  let task = Promise.resolve();
  stack.defer(async () => await task);
  const buildDebounced = debounce(() => {
    task = task.then(async () => {
      await build(parser);
    });
  }, 200);
  buildDebounced();
  buildDebounced.flush();
  for await (const _ of watcher) {
    buildDebounced();
  }
  unreachable();
}
