import { noEmphasis } from "../translator2/word.ts";
import * as English from "./ast.ts";

export const NOT: English.Adverb = {
  adverb: noEmphasis("not"),
  negative: true,
};
export function extractNegativeFromMultipleAdverbs(
  adverbs: ReadonlyArray<English.Adverb>,
): null | ReadonlyArray<English.Adverb> {
  const index = adverbs.findIndex(({ negative }) => negative);
  if (index === -1) {
    return null;
  } else {
    const spliced = [...adverbs];
    spliced.splice(index, 1);
    return spliced;
  }
}
