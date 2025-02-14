import * as Dictionary from "../../dictionary/type.ts";
import { repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as English from "./ast.ts";
import { nounForms, PartialNoun } from "./noun.ts";

function pronounForms(
  pronoun: Dictionary.Pronoun,
  place: "subject" | "object",
): { singular: null | string; plural: null | string } {
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
  place: "subject" | "object",
): PartialNoun {
  return {
    ...pronounForms(pronoun, place),
    determiner: [],
    adjective: [],
    reduplicationCount,
    postAdjective: null,
    emphasis,
  };
}
export function pronoun(
  definition: Dictionary.Pronoun,
  reduplicationCount: number,
  emphasis: boolean,
  place: "subject" | "object",
): Output<English.NounPhrase> {
  const { singular, plural } = pronounForms(definition, place);
  return nounForms(singular, plural, "both")
    .map(({ noun, quantity }) => ({
      type: "simple",
      determiner: [],
      adjective: [],
      noun: {
        word: repeatWithSpace(noun, reduplicationCount),
        emphasis,
      },
      quantity,
      postCompound: null,
      postAdjective: null,
      preposition: [],
      emphasis: false,
    }));
}
