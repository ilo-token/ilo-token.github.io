import * as English from "./ast.ts";
import { noEmphasis } from "./word.ts";

export function nounAsPreposition(
  phrase: English.NounPhrase,
  preposition: string,
): English.Preposition {
  return {
    adverbs: [],
    preposition: noEmphasis(preposition),
    object: phrase,
    emphasis: false,
  };
}
