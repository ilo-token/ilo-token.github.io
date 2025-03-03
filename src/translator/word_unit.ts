import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { TranslationTodoError } from "./error.ts";
import { PartialNoun, partialNoun } from "./noun.ts";
import { number } from "./number.ts";
import { partialPronoun, Place } from "./pronoun.ts";
import { PartialVerb, partialVerb } from "./verb.ts";

export type WordUnitTranslation =
  | ({ type: "noun" } & PartialNoun)
  | { type: "adjective"; adjective: English.AdjectivePhrase }
  | ({ type: "verb" } & PartialVerb);
function defaultWordUnit(
  word: string,
  reduplicationCount: number,
  emphasis: null | TokiPona.Emphasis,
  place: Place,
  includeGerund: boolean,
): ArrayResult<WordUnitTranslation> {
  return new ArrayResult(dictionary.get(word)!.definitions)
    .flatMap((definition) => {
      switch (definition.type) {
        case "noun":
          if (!includeGerund && definition.gerund) {
            return new ArrayResult();
          } else {
            return partialNoun(definition, reduplicationCount, emphasis != null)
              .map<WordUnitTranslation>((noun) => ({ ...noun, type: "noun" }));
          }
        case "personal pronoun":
          return new ArrayResult<WordUnitTranslation>([{
            ...partialPronoun(
              definition,
              reduplicationCount,
              emphasis != null,
              place,
            ),
            type: "noun",
          }]);
        case "adjective":
          return adjective(
            definition,
            reduplicationCount,
            emphasis,
          )
            .map<WordUnitTranslation>((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "compound adjective":
          return compoundAdjective(
            definition.adjective,
            reduplicationCount,
            emphasis,
          )
            .map<WordUnitTranslation>((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "verb":
          return partialVerb(definition, reduplicationCount, emphasis != null)
            .map<WordUnitTranslation>((verb) => ({ ...verb, type: "verb" }));
        default:
          return new ArrayResult();
      }
    });
}
export function wordUnit(
  wordUnit: TokiPona.WordUnit,
  place: Place,
  includeGerund: boolean,
): ArrayResult<WordUnitTranslation> {
  switch (wordUnit.type) {
    case "number":
      return number(wordUnit.words)
        .map<WordUnitTranslation>((number) => ({
          type: "noun",
          determiner: [],
          adjective: [],
          singular: `${number}`,
          plural: null,
          reduplicationCount: 1,
          emphasis: wordUnit.emphasis != null,
          perspective: "third",
          postAdjective: null,
        }));
    case "x ala x":
      return new ArrayResult(new TranslationTodoError("x ala x"));
    case "default":
    case "reduplication": {
      let reduplicationCount: number;
      switch (wordUnit.type) {
        case "default":
          reduplicationCount = 1;
          break;
        case "reduplication":
          reduplicationCount = wordUnit.count;
          break;
      }
      return defaultWordUnit(
        wordUnit.word,
        reduplicationCount,
        wordUnit.emphasis,
        place,
        includeGerund,
      );
    }
  }
}
