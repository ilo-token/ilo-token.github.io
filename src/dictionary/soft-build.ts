// this code is Deno only

import { exists } from "@std/fs/exists";

if (import.meta.main) {
  if (!await exists(new URL("./dictionary.ts", import.meta.url))) {
    const Dictionary = await import("./build.ts");
    if (!await Dictionary.build()) {
      await Dictionary.buildWithDictionary(new Map());
      // deno-lint-ignore no-console
      console.error(
        "Dictionary failed to build. Empty dictionary is used instead. Please fix it.",
      );
    }
  }
}
