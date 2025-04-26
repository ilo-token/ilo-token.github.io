import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array_result.ts";
import * as English from "./ast.ts";
import { fromNounForms, PartialNoun } from "./noun.ts";
import { word } from "./word.ts";

export type Place = "subject" | "object";

function pronounForms(pronoun: Dictionary.PronounForms, place: Place) {
  switch (place) {
    case "subject":
      return {
        singular: pronoun.singular?.subject ?? null,
        plural: pronoun.plural?.subject ?? null,
      };
    case "object":
      return {
        singular: pronoun.singular?.object ?? null,
        plural: pronoun.plural?.object ?? null,
      };
  }
}
export function partialPronoun(
  options: Readonly<{
    pronoun: Dictionary.Pronoun;
    reduplicationCount: number;
    emphasis: boolean;
    place: Place;
  }>,
): PartialNoun {
  const { pronoun, place } = options;
  return {
    ...options,
    ...pronounForms(pronoun, place),
    determiner: [],
    adjective: [],
    perspective: pronoun.perspective,
    postAdjective: null,
  };
}
export function pronoun(
  options: Readonly<{
    definition: Dictionary.Pronoun;
    reduplicationCount: number;
    emphasis: boolean;
    place: Place;
  }>,
): ArrayResult<English.NounPhrase> {
  const { definition, place } = options;
  return fromNounForms(pronounForms(definition, place), "both")
    .map(({ noun, quantity }) => ({
      type: "simple",
      determiner: [],
      adjective: [],
      noun: word({ ...options, word: noun }),
      quantity,
      perspective: definition.perspective,
      postCompound: null,
      postAdjective: null,
      preposition: [],
      emphasis: false,
    }));
}
