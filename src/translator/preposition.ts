import { throwError } from "../../misc/misc.ts";
import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import { fixAdverb } from "./adverb.ts";
import * as English from "./ast.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { multipleModifiers } from "./modifier.ts";
import { multiplePhrases } from "./phrase.ts";
import { noEmphasis, word } from "./word.ts";
import { getReduplicationCount } from "./word_unit.ts";

export function preposition(
  preposition: TokiPona.Preposition,
): ArrayResult<English.Preposition> {
  return ArrayResult.combine(
    prepositionAsWord(preposition.preposition),
    multipleModifiers(preposition.modifiers)
      .filterMap((modifier) =>
        modifier.type === "adverbial"
          ? (modifier.inWayPhrase == null ? modifier.adverb : throwError(
            new FilteredError(
              '"in [adjective] way" prepositional phrase modifying preposition',
            ),
          ))
          : throwError(new FilteredError("adjectives modifying preposition"))
      )
      .map(fixAdverb),
    multiplePhrases({
      phrases: preposition.phrases,
      place: "object",
      includeGerund: true,
      andParticle: null,
      includeVerb: false,
    })
      .filterMap((phrases) =>
        phrases.type === "noun"
          ? phrases.noun
          : throwError(new FilteredError(`${phrases.type} as indirect object`))
      ),
  )
    .map(([preposition, adverb, object]) => ({
      adverb,
      preposition,
      object,
      emphasis: preposition.emphasis,
    }));
}
function prepositionAsWord(
  preposition: TokiPona.HeadedWordUnit,
): ArrayResult<English.Word> {
  switch (preposition.type) {
    case "x ala x":
      return new ArrayResult(
        new TranslationTodoError("preposition ala preposition"),
      );
    case "default":
    case "reduplication":
      return new ArrayResult(
        dictionary.get(preposition.word)!.definitions,
      )
        .filterMap((definition) =>
          definition.type === "preposition"
            ? word({
              word: definition.preposition,
              reduplicationCount: getReduplicationCount(preposition),
              emphasis: preposition.emphasis != null,
            })
            : null
        );
  }
}
export function nounAsPreposition(
  phrase: English.NounPhrase,
  preposition: string,
): English.Preposition {
  return {
    adverb: [],
    preposition: noEmphasis(preposition),
    object: phrase,
    emphasis: false,
  };
}
