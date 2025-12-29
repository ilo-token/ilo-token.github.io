import * as Dictionary from "../../dictionary/type.ts";
import * as English from "./ast.ts";

export type Place = "subject" | "object";

export function pronoun(
  options: Readonly<{
    pronoun: Dictionary.Pronoun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): English.SimpleNounPhrase {
  const { pronoun, emphasis } = options;
  return {
    ...options,
    ...pronoun,
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
