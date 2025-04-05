import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array_result.ts";
import { nullableAsArray } from "../../misc/misc.ts";
import { settings } from "../settings.ts";
import { adjective } from "./adjective.ts";
import * as English from "./ast.ts";
import * as EnglishComposer from "./composer.ts";
import { determiner } from "./determiner.ts";
import { condense } from "./misc.ts";
import { word } from "./word.ts";

export type PartialNoun =
  & Dictionary.NounForms
  & Readonly<{
    determiner: ReadonlyArray<English.Determiner>;
    adjective: ReadonlyArray<English.AdjectivePhrase>;
    reduplicationCount: number;
    emphasis: boolean;
    perspective: Dictionary.Perspective;
    postAdjective: null | { adjective: string; name: string };
  }>;
export function partialNoun(
  options: Readonly<{
    definition: Dictionary.Noun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): ArrayResult<PartialNoun> {
  const { definition } = options;
  const engDeterminer = ArrayResult.combine(
    ...definition.determiner
      .map((definition) =>
        determiner({ definition, reduplicationCount: 1, emphasis: false })
      ),
  );
  const engAdjective = ArrayResult.combine(
    ...definition.adjective
      .map((definition) =>
        adjective({ definition, reduplicationCount: 1, emphasis: null })
      ),
  );
  return ArrayResult.combine(engDeterminer, engAdjective)
    .map(([determiner, adjective]) => ({
      ...options,
      ...definition,
      determiner,
      adjective,
      perspective: "third",
    }));
}
export function fromNounForms(
  nounForms: Dictionary.NounForms,
  determinerNumber: Dictionary.Quantity,
): ArrayResult<{ noun: string; quantity: English.Quantity }> {
  const { singular, plural } = nounForms;
  switch (determinerNumber) {
    case "singular":
    case "plural": {
      let noun: null | string;
      switch (determinerNumber) {
        case "singular":
          noun = singular;
          break;
        case "plural":
          noun = plural;
          break;
      }
      return new ArrayResult(nullableAsArray(noun))
        .map((noun) => ({ noun, quantity: determinerNumber }));
    }
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
  }
}
export function simpleNounForms(
  nounForms: Dictionary.NounForms,
): ArrayResult<string> {
  return fromNounForms(nounForms, "both").map(({ noun }) => noun);
}
export function noun(
  options: Readonly<{
    definition: Dictionary.Noun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): ArrayResult<English.NounPhrase> {
  const { definition } = options;
  return ArrayResult.combine(
    fromNounForms(definition, "both"),
    partialNoun(options),
  )
    .map(([{ noun, quantity }, partialNoun]) => ({
      ...partialNoun,
      type: "simple",
      noun: word({ ...options, word: noun }),
      postCompound: null,
      quantity,
      preposition: [],
      emphasis: false,
    }));
}
export function nounAsPlainString(
  definition: Dictionary.Noun,
): ArrayResult<string> {
  return noun({ definition, reduplicationCount: 1, emphasis: false })
    .map((noun) => EnglishComposer.noun(noun, 0));
}
export function perspective(noun: English.NounPhrase): Dictionary.Perspective {
  switch (noun.type) {
    case "simple":
      return noun.perspective;
    case "compound":
      return "third";
  }
}
