import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";

export function fixAdverb(
  adverb: ReadonlyArray<English.Adverb>,
): ReadonlyArray<English.Adverb> {
  if (adverb.length > 1) {
    throw new FilteredError("multiple adverbs");
  } else {
    return adverb;
  }
}
