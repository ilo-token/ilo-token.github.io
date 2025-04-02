import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";

export function fixAdverb(
  adverb: ReadonlyArray<English.Word>,
): ReadonlyArray<English.Word> {
  if (adverb.length > 1) {
    throw new FilteredError("multiple adverbs");
  } else {
    return adverb;
  }
}
