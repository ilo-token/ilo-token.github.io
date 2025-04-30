import { Definition } from "../../dictionary/type.ts";
import { IterableResult } from "../compound.ts";
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
  const { word: useWord, reduplicationCount, emphasis, includeGerund } =
    options;
  return IterableResult.fromArray(dictionary.get(useWord)!.definitions)
    .flatMap<WordUnitTranslation>((definition) => {
      switch (definition.type) {
        case "noun":
          if (!includeGerund && definition.gerund) {
            return IterableResult.empty();
          } else {
            return partialNoun({
              ...options,
              definition,
              emphasis: emphasis != null,
            })
              .map((noun) => ({ ...noun, type: "noun" }));
          }
        case "personal pronoun":
          return IterableResult.single({
            ...partialPronoun({
              ...options,
              pronoun: definition,
              emphasis: emphasis != null,
            }),
            type: "noun",
          });
        case "adjective":
          if (!includeGerund && definition.gerundLike) {
            return IterableResult.empty();
          } else {
            return adjective({ ...options, definition })
              .map((adjective) => ({
                type: "adjective",
                adjective,
              }));
          }
        case "compound adjective":
          return compoundAdjective({
            ...options,
            adjectives: definition.adjectives,
          })
            .map((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "verb":
          return partialVerb({
            ...options,
            definition,
            emphasis: emphasis != null,
          })
            .map((verb) => ({ ...verb, type: "verb" }));
        case "modal verb":
          return IterableResult.single({
            type: "verb",
            modal: {
              preAdverbs: [],
              verb: word({
                word: definition.verb,
                reduplicationCount,
                emphasis: emphasis != null,
              }),
              postAdverb: null,
            },
            first: null,
            rest: [],
            subjectComplement: null,
            object: null,
            objectComplement: null,
            prepositions: [],
            forObject: false,
            predicateType: null,
            emphasis: false,
          });
        default:
          return IterableResult.empty();
      }
    });
}
export function wordUnit(
  options: Readonly<{
    wordUnit: TokiPona.WordUnit;
    place: Place;
    includeGerund: boolean;
  }>,
): IterableResult<WordUnitTranslation> {
  const { wordUnit } = options;
  switch (wordUnit.type) {
    case "number":
      return number(wordUnit.words)
        .map((number) => ({
          type: "noun",
          determiners: [],
          adjectives: [],
          singular: `${number}`,
          plural: null,
          reduplicationCount: 1,
          emphasis: wordUnit.emphasis != null,
          perspective: "third",
          postAdjective: null,
        }));
    case "x ala x":
      return IterableResult.errors([new TranslationTodoError("x ala x")]);
    case "simple":
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
): IterableResult<English.Word> {
  switch (wordUnit.type) {
    case "simple":
    case "reduplication":
      return IterableResult.fromArray(
        dictionary.get(wordUnit.word)!.definitions,
      )
        .filterMap(mapper)
        .map((useWord) =>
          word({
            word: useWord,
            reduplicationCount: getReduplicationCount(wordUnit),
            emphasis: wordUnit.emphasis != null,
          })
        );
    case "number":
      return IterableResult.empty();
    case "x ala x":
      return IterableResult.errors([new TranslationTodoError("x ala x")]);
  }
}
export function getReduplicationCount(wordUnit: TokiPona.WordUnit): number {
  switch (wordUnit.type) {
    case "number":
    case "simple":
    case "x ala x":
      return 1;
    case "reduplication":
      return wordUnit.count;
  }
}
