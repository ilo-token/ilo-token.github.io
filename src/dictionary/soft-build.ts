// this code is Deno only

import { exists } from "@std/fs/exists";
import { Parser } from "./parallel_parser.ts";

if (import.meta.main) {
  using parser = new Parser();
  if (!await exists(new URL("./global_dictionary.ts", import.meta.url))) {
    const Dictionary = await import("./build.ts");
    if (!await Dictionary.build(parser)) {
      await Dictionary.buildWithDictionary(new Map());
      // deno-lint-ignore no-console
      console.error(
        "Dictionary failed to build. Empty dictionary is used instead. Please fix it.",
      );
    }
  }
}
