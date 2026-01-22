import { noEmphasis } from "../translator/word.ts";
import * as English from "../resolver_and_composer/ast.ts";

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
