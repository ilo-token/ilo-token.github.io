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
  | (Readonly<{ type: "noun" }> & PartialNoun)
  | Readonly<{ type: "adjective"; adjective: English.AdjectivePhrase }>
  | (Readonly<{ type: "verb" }> & PartialVerb);
function defaultWordUnit(
  options: Readonly<{
    word: string;
    reduplicationCount: number;
    emphasis: null | TokiPona.Emphasis;
    place: Place;
    includeGerund: boolean;
  }>,
): ArrayResult<WordUnitTranslation> {
  const { word, emphasis, includeGerund } = options;
  return new ArrayResult(dictionary.get(word)!.definitions)
    .flatMap((definition) => {
      switch (definition.type) {
        case "noun":
          if (!includeGerund && definition.gerund) {
            return new ArrayResult();
          } else {
            return partialNoun({
              ...options,
              definition,
              emphasis: emphasis != null,
            })
              .map<WordUnitTranslation>((noun) => ({ ...noun, type: "noun" }));
          }
        case "personal pronoun":
          return new ArrayResult<WordUnitTranslation>([{
            ...partialPronoun({
              ...options,
              pronoun: definition,
              emphasis: emphasis != null,
            }),
            type: "noun",
          }]);
        case "adjective":
          return adjective({ ...options, definition })
            .map<WordUnitTranslation>((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "compound adjective":
          return compoundAdjective({
            ...options,
            adjectives: definition.adjective,
          })
            .map<WordUnitTranslation>((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "verb":
          return partialVerb({
            ...options,
            definition,
            emphasis: emphasis != null,
          })
            .map<WordUnitTranslation>((verb) => ({ ...verb, type: "verb" }));
        default:
          return new ArrayResult();
      }
    });
}
export function wordUnit(
  options: Readonly<{
    wordUnit: TokiPona.WordUnit;
    place: Place;
    includeGerund: boolean;
  }>,
): ArrayResult<WordUnitTranslation> {
  const { wordUnit } = options;
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
      const reduplicationCount = getReduplicationCount(wordUnit);
      return defaultWordUnit({
        ...options,
        word: wordUnit.word,
        reduplicationCount,
        emphasis: wordUnit.emphasis,
      });
    }
  }
}
export function getReduplicationCount(wordUnit: TokiPona.WordUnit): number {
  switch (wordUnit.type) {
    case "number":
    case "default":
    case "x ala x":
      return 1;
    case "reduplication":
      return wordUnit.count;
  }
}
