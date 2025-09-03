import { throwError } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import { extractNegativeFromMultipleAdverbs } from "./adverb.ts";
import * as English from "./ast.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { multipleModifiers } from "./modifier.ts";
import { multiplePhrases } from "./phrase.ts";
import { noEmphasis, word } from "./word.ts";
import { getReduplicationCount } from "./word_unit.ts";

export function preposition(
  preposition: TokiPona.Preposition,
): IterableResult<English.Preposition> {
  return IterableResult.combine(
    prepositionAsWord(preposition.preposition),
    multipleModifiers(preposition.modifiers)
      .map((modifier) =>
        modifier.type === "adverbial"
          ? (modifier.inWayPhrase == null ? modifier.adverbs : throwError(
            new FilteredError(
              '"in [adjective] way" prepositional phrase modifying ' +
                "preposition",
            ),
          ))
          : throwError(new FilteredError("adjectives modifying preposition"))
      ),
    multiplePhrases({
      phrases: preposition.phrases,
      place: "object",
      includeGerund: true,
      andParticle: null,
    })
      .map((phrases) =>
        phrases.type === "noun"
          ? phrases.noun
          : throwError(new FilteredError(`${phrases.type} as indirect object`))
      ),
  )
    .map(([preposition, adverbs, object]): English.Preposition => ({
      adverbs,
      preposition,
      object,
      emphasis: preposition.emphasis,
    }));
}
function prepositionAsWord(
  preposition: TokiPona.HeadedWordUnit,
): IterableResult<English.Word> {
  switch (preposition.type) {
    case "x ala x":
      return IterableResult.errors([
        new TranslationTodoError("preposition ala preposition"),
      ]);
    case "simple":
    case "reduplication":
      return IterableResult.fromArray(
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
    adverbs: [],
    preposition: noEmphasis(preposition),
    object: phrase,
    emphasis: false,
  };
}
export function extractNegativeFromPreposition(
  preposition: English.Preposition,
): null | English.Preposition {
  const adverbs = extractNegativeFromMultipleAdverbs(preposition.adverbs);
  if (adverbs == null) {
    return null;
  } else {
    return { ...preposition, adverbs };
  }
}
