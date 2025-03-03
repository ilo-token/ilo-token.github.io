import { ArrayResult } from "../array_result.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { TranslationTodoError } from "./error.ts";
import { unemphasized } from "./word.ts";

export function preposition(
  _preposition: TokiPona.Preposition,
): ArrayResult<English.Preposition> {
  throw new TranslationTodoError("preposition");
}
export function nounAsPreposition(
  phrase: English.NounPhrase,
  preposition: string,
): English.Preposition {
  return {
    adverb: [],
    preposition: unemphasized(preposition),
    object: phrase,
  };
}
