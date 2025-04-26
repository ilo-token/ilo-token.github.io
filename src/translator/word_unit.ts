import { Definition } from "../../dictionary/type.ts";
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
import { word } from "./word.ts";

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
) {
  const { word, emphasis, includeGerund } = options;
  return new ArrayResult(dictionary.get(word)!.definitions)
    .flatMap<WordUnitTranslation>((definition) => {
      switch (definition.type) {
        case "noun":
          if (!includeGerund && definition.gerund) {
            return ArrayResult.empty();
          } else {
            return partialNoun({
              ...options,
              definition,
              emphasis: emphasis != null,
            })
              .map((noun) => ({ ...noun, type: "noun" }) as const);
          }
        case "personal pronoun":
          return new ArrayResult([
            {
              ...partialPronoun({
                ...options,
                pronoun: definition,
                emphasis: emphasis != null,
              }),
              type: "noun",
            } as const,
          ]);
        case "adjective":
          if (!includeGerund && definition.gerundLike) {
            return ArrayResult.empty();
          } else {
            return adjective({ ...options, definition })
              .map((adjective) =>
                ({
                  type: "adjective",
                  adjective,
                }) as const
              );
          }
        case "compound adjective":
          return compoundAdjective({
            ...options,
            adjectives: definition.adjective,
          })
            .map((adjective) =>
              ({
                type: "adjective",
                adjective,
              }) as const
            );
        case "verb":
          return partialVerb({
            ...options,
            definition,
            emphasis: emphasis != null,
          })
            .map((verb) => ({ ...verb, type: "verb" }) as const);
        default:
          return ArrayResult.empty();
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
        .map((number) => ({
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
      return ArrayResult.errors([new TranslationTodoError("x ala x")]);
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
export function fromSimpleDefinition(
  wordUnit: TokiPona.WordUnit,
  mapper: (definition: Definition) => null | string,
): ArrayResult<English.Word> {
  switch (wordUnit.type) {
    case "default":
    case "reduplication":
      return new ArrayResult(dictionary.get(wordUnit.word)!.definitions)
        .filterMap(mapper)
        .map((useWord) =>
          word({
            word: useWord,
            reduplicationCount: getReduplicationCount(wordUnit),
            emphasis: wordUnit.emphasis != null,
          })
        );
    case "number":
      return ArrayResult.empty();
    case "x ala x":
      return ArrayResult.errors([new TranslationTodoError("x ala x")]);
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
