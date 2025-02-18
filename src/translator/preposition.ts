import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { TranslationTodoError } from "./error.ts";
import { unemphasized } from "./word.ts";

export function preposition(
  preposition: TokiPona.Preposition,
): Output<English.Preposition> {
  throw new TranslationTodoError("preposition");
}
export function nounAsPreposition(
  phrase: English.NounPhrase,
  preposition: string,
): English.Preposition {
  return {
    preposition: unemphasized(preposition),
    object: phrase,
  };
}
