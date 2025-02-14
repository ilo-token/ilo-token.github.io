import * as Dictionary from "../../dictionary/type.ts";
import { repeatWithSpace } from "../misc.ts";
import { nounForms, PartialNoun } from "./noun.ts";
import * as English from "./ast.ts";
import { Output } from "../output.ts";

export function pronounAsPartialNoun(
  pronoun: Dictionary.Pronoun,
  reduplicationCount: number,
  emphasis: boolean,
  place: "subject" | "object",
): PartialNoun {
  let singular: null | string;
  let plural: null | string;
  switch (place) {
    case "subject":
      singular = pronoun.singular?.subject ?? null;
      plural = pronoun.plural?.subject ?? null;
      break;
    case "object":
      singular = pronoun.singular?.object ?? null;
      plural = pronoun.plural?.object ?? null;
      break;
  }
  return {
    determiner: [],
    adjective: [],
    singular,
    plural,
    reduplicationCount,
    postAdjective: null,
    emphasis,
  };
}
export function pronounAsObject(
  definition: Dictionary.Pronoun,
  reduplicationCount: number,
  emphasis: boolean,
): Output<English.NounPhrase> {
  return nounForms(
    definition.singular?.object,
    definition.plural?.object,
    "both",
  )
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
