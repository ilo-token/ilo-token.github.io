import * as English from "./ast.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import { settings } from "../settings.ts";
import * as Dictionary from "../../dictionary/type.ts";
import { condense } from "./misc.ts";
import { determiner, findNumber } from "./determiner.ts";
import { adjective } from "./adjective.ts";

export function nounForms(
  singular: undefined | null | string,
  plural: undefined | null | string,
  determinerNumber: Dictionary.Quantity,
): Output<{ noun: string; quantity: English.Quantity }> {
  switch (determinerNumber) {
    case "both":
      switch (settings.quantity) {
        case "both":
          return new Output([
            ...nullableAsArray(singular)
              .map((noun) => ({ noun, quantity: "singular" as const })),
            ...nullableAsArray(plural)
              .map((noun) => ({ noun, quantity: "plural" as const })),
          ]);
        case "condensed":
          if (singular != null && plural != null) {
            return new Output([{
              noun: condense(singular, plural),
              quantity: "condensed",
            }]);
          }
          // fallthrough
        case "default only":
          if (singular != null) {
            return new Output([{ noun: singular, quantity: "singular" }]);
          } else {
            return new Output([{ noun: plural!, quantity: "plural" }]);
          }
      }
      // unreachable
      // fallthrough
    case "singular":
      return new Output(nullableAsArray(singular))
        .map((noun) => ({ noun, quantity: "singular" as const }));
    case "plural":
      return new Output(nullableAsArray(plural))
        .map((noun) => ({ noun, quantity: "plural" as const }));
  }
}
export function simpleNounForms(
  singular: undefined | null | string,
  plural: undefined | null | string,
): Output<string> {
  return nounForms(singular, plural, "both").map((noun) => noun.noun);
}
export function noun(
  definition: Dictionary.Noun,
  emphasis: boolean,
  reduplicationCount: number,
): Output<English.NounPhrase> {
  const engDeterminer = Output.combine(
    ...definition.determiner
      .map((definition) => determiner(definition, false, 1)),
  );
  const engAdjective = Output.combine(
    ...definition.adjective
      .map((definition) => adjective(definition, null, 1)),
  );
  return Output.combine(engDeterminer, engAdjective)
    .flatMap(([determiner, adjective]) => {
      return nounForms(
        definition.singular,
        definition.plural,
        findNumber(determiner),
      )
        .map((noun) => ({
          type: "simple",
          determiner,
          adjective,
          noun: {
            word: repeatWithSpace(noun.noun, reduplicationCount),
            emphasis,
          },
          quantity: noun.quantity,
          postCompound: null,
          postAdjective: definition.postAdjective,
          preposition: [],
          emphasis: false,
        }));
    });
}
