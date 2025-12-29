import * as Dictionary from "../../dictionary/type.ts";
import * as English from "./ast.ts";

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
export function pronoun(
  options: Readonly<{
    pronoun: Dictionary.Pronoun;
    reduplicationCount: number;
    emphasis: boolean;
    place: Place;
  }>,
): English.SimpleNounPhrase {
  const { pronoun, place, emphasis } = options;
  return {
    ...options,
    ...pronounForms(pronoun, place),
    determiners: [],
    adjectives: [],
    perspective: pronoun.perspective,
    wordEmphasis: emphasis,
    postCompound: null,
    prepositions: [],
    adjectiveName: null,
    phraseEmphasis: false,
  };
}
