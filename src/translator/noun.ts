import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array-result.ts";
import { nullableAsArray } from "../misc.ts";
import { settings } from "../settings.ts";
import { adjective } from "./adjective.ts";
import * as English from "./ast.ts";
import * as EnglishComposer from "./composer.ts";
import { determiner } from "./determiner.ts";
import { condense } from "./misc.ts";
import { word } from "./word.ts";

export type PartialNoun = Dictionary.NounForms & {
  determiner: Array<English.Determiner>;
  adjective: Array<English.AdjectivePhrase>;
  reduplicationCount: number;
  emphasis: boolean;
  perspective: Dictionary.Perspective;
  postAdjective: null | { adjective: string; name: string };
};
export function partialNoun(
  definition: Dictionary.Noun,
  reduplicationCount: number,
  emphasis: boolean,
): ArrayResult<PartialNoun> {
  const engDeterminer = ArrayResult.combine(
    ...definition.determiner
      .map((definition) => determiner(definition, 1, false)),
  );
  const engAdjective = ArrayResult.combine(
    ...definition.adjective
      .map((definition) => adjective(definition, 1, null)),
  );
  return ArrayResult.combine(engDeterminer, engAdjective)
    .map(([determiner, adjective]) => ({
      determiner,
      adjective,
      singular: definition.singular,
      plural: definition.plural,
      perspective: "third",
      reduplicationCount,
      postAdjective: definition.postAdjective,
      emphasis,
    }));
}
export function fromNounForms(
  nounForms: Dictionary.NounForms,
  determinerNumber: Dictionary.Quantity,
): ArrayResult<{ noun: string; quantity: English.Quantity }> {
  const { singular, plural } = nounForms;
  switch (determinerNumber) {
    case "both":
      switch (settings.quantity) {
        case "both":
          return new ArrayResult([
            ...nullableAsArray(singular)
              .map((noun) => ({ noun, quantity: "singular" as const })),
            ...nullableAsArray(plural)
              .map((noun) => ({ noun, quantity: "plural" as const })),
          ]);
        case "condensed":
          if (singular != null && plural != null) {
            return new ArrayResult([{
              noun: condense(singular, plural),
              quantity: "condensed",
            }]);
          }
          // fallthrough
        case "default only":
          if (singular != null) {
            return new ArrayResult([{ noun: singular, quantity: "singular" }]);
          } else {
            return new ArrayResult([{ noun: plural!, quantity: "plural" }]);
          }
      }
      // unreachable
      // fallthrough
    case "singular":
      return new ArrayResult(nullableAsArray(singular))
        .map((noun) => ({ noun, quantity: "singular" as const }));
    case "plural":
      return new ArrayResult(nullableAsArray(plural))
        .map((noun) => ({ noun, quantity: "plural" as const }));
  }
}
export function simpleNounForms(
  nounForms: Dictionary.NounForms,
): ArrayResult<string> {
  return fromNounForms(nounForms, "both").map((noun) => noun.noun);
}
export function noun(
  definition: Dictionary.Noun,
  reduplicationCount: number,
  emphasis: boolean,
): ArrayResult<English.NounPhrase> {
  return ArrayResult.combine(
    fromNounForms(definition, "both"),
    partialNoun(definition, reduplicationCount, emphasis),
  )
    .map(([{ noun, quantity }, partialNoun]) => ({
      ...partialNoun,
      type: "simple",
      noun: word(noun, reduplicationCount, emphasis),
      quantity,
      preposition: [],
      emphasis: false,
    }));
}
export function nounAsPlainString(
  definition: Dictionary.Noun,
): ArrayResult<string> {
  return noun(definition, 1, false).map((noun) =>
    EnglishComposer.noun(noun, 0)
  );
}
