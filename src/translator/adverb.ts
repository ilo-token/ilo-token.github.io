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
export function extractNegativeFromAdverbs(
  adverb: ReadonlyArray<English.Adverb>,
): null | ReadonlyArray<English.Adverb> {
  const index = adverb.findIndex(({ negative }) => negative);
  if (index === -1) {
    return null;
  } else {
    return [...adverb].splice(index, 1);
  }
}
