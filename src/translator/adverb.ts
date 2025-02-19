import * as English from "./ast.ts";
import { FilteredOutError } from "./error.ts";

export function fixAdverb(adverb: Array<English.Word>): Array<English.Word> {
  if (adverb.length > 1) {
    throw new FilteredOutError("multiple adverbs");
  } else {
    return adverb;
  }
}
