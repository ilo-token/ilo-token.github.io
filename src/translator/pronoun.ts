import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array-result.ts";
import * as English from "./ast.ts";
import { fromNounForms, PartialNoun } from "./noun.ts";
import { word } from "./word.ts";

export type Place = "subject" | "object";

function pronounForms(
  pronoun: Dictionary.PronounForms,
  place: Place,
): Dictionary.NounForms {
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
  pronoun: Dictionary.Pronoun,
  reduplicationCount: number,
  emphasis: boolean,
  place: Place,
): PartialNoun {
  return {
    ...pronounForms(pronoun, place),
    determiner: [],
    adjective: [],
    reduplicationCount,
    perspective: pronoun.perspective,
    postAdjective: null,
    emphasis,
  };
}
export function pronoun(
  definition: Dictionary.Pronoun,
  reduplicationCount: number,
  emphasis: boolean,
  place: Place,
): ArrayResult<English.NounPhrase> {
  return fromNounForms(pronounForms(definition, place), "both")
    .map(({ noun, quantity }) => ({
      type: "simple",
      determiner: [],
      adjective: [],
      noun: word(noun, reduplicationCount, emphasis),
      quantity,
      perspective: definition.perspective,
      postCompound: null,
      postAdjective: null,
      preposition: [],
      emphasis: false,
    }));
}
