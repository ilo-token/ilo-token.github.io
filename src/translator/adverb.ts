import * as English from "./ast.ts";
import { noEmphasis } from "./word.ts";

export const NOT = { adverb: noEmphasis("not"), negative: true };

export function extractNegativeFromAdverbs(
  adverb: ReadonlyArray<English.Adverb>,
): null | ReadonlyArray<English.Adverb> {
  const index = adverb.findIndex(({ negative }) => negative);
  if (index === -1) {
    return null;
  } else {
    const spliced = [...adverb];
    spliced.splice(index, 1);
    return spliced;
  }
}
