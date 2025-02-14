import * as Dictionary from "../../dictionary/type.ts";
import { PartialNoun } from "./noun.ts";

export function pronoun(
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
