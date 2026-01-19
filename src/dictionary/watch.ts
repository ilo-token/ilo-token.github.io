// this code is Deno only

import { unreachable } from "@std/assert/unreachable";
import { debounce } from "@std/async/debounce";
import { MuxAsyncIterator } from "@std/async/mux-async-iterator";
import { build } from "./build.ts";
import { Parser } from "./parallel_parser.ts";

// deno-lint-ignore require-yield
async function* errorOnly(promise: Promise<never>): AsyncGenerator<never> {
  await promise;
}
async function* addOneBefore<T>(
  first: T,
  iterable: AsyncIterable<T>,
): AsyncGenerator<T> {
  yield first;
  yield* iterable;
}
if (import.meta.main) {
  using watcher = Deno.watchFs("./dictionary.txt");
  using parser = new Parser();

  const { promise, reject } = Promise.withResolvers<never>();
  const errorGenerator = errorOnly(promise);

  let task = Promise.resolve();
  const buildDebounced = debounce(() => {
    task = task.then(async () => {
      try {
        await build(parser);
      } catch (error) {
        reject(error);
      }
    });
  }, 200);

  const watcherWithError = new MuxAsyncIterator<null | Deno.FsEvent>();
  watcherWithError.add(addOneBefore(null, watcher));
  watcherWithError.add(errorGenerator);

  for await (const _ of watcherWithError) {
    buildDebounced();
  }
  unreachable();
}
