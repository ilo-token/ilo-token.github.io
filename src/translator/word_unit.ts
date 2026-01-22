import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary/dictionary.ts";
import { Definition } from "../dictionary/type.ts";
import * as TokiPona from "../parser/ast.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { TranslationTodoError } from "./error.ts";
import { noun } from "./noun.ts";
import { number, numberAsText } from "./number.ts";
import { pronoun } from "./pronoun.ts";
import { verb } from "./verb.ts";
import { word } from "./word.ts";

export type WordUnitTranslation =
  | (Readonly<{ type: "noun" }> & English.SimpleNounPhrase)
  | Readonly<{ type: "adjective"; adjective: English.AdjectivePhrase }>
  | (Readonly<{ type: "verb" }> & English.SimpleVerbPhrase);

function defaultWordUnit(
  options: Readonly<{
    word: string;
    reduplicationCount: number;
    emphasis: null | TokiPona.Emphasis;
  }>,
) {
  const { word: useWord, reduplicationCount, emphasis } = options;
  return IterableResult.fromArray(dictionary.get(useWord)!.definitions)
    .flatMap((definition) => {
      switch (definition.type) {
        case "noun":
          return noun({
            ...options,
            definition,
            emphasis: emphasis != null,
          })
            .map((noun): WordUnitTranslation => ({ ...noun, type: "noun" }));
        case "personal pronoun":
          return IterableResult.single<WordUnitTranslation>({
            ...pronoun({
              ...options,
              pronoun: definition,
              emphasis: emphasis != null,
            }),
            type: "noun",
          });
        case "adjective":
          return adjective({ ...options, definition })
            .map((adjective): WordUnitTranslation => ({
              type: "adjective",
              adjective,
            }));

        case "compound adjective":
          return compoundAdjective({
            ...options,
            adjectives: definition.adjectives,
          })
            .map((adjective): WordUnitTranslation => ({
              type: "adjective",
              adjective,
            }));
        case "verb":
          return verb({
            ...options,
            definition,
            emphasis: emphasis != null,
          })
            .map((verb): WordUnitTranslation => ({ ...verb, type: "verb" }));
        case "modal verb":
          return IterableResult.single<WordUnitTranslation>({
            type: "verb",
            verb: [
              {
                preAdverbs: [],
                verb: {
                  ...word({
                    word: definition.verb,
                    reduplicationCount,
                    emphasis: emphasis != null,
                  }),
                  type: "modal",
                },
                postAdverb: null,
              },
            ],
            subjectComplement: null,
            contentClause: null,
            object: null,
            objectComplement: null,
            forObject: false,
            prepositions: [],
            predicateType: "verb",
            hideVerb: false,
            emphasis: false,
          });
        default:
          return IterableResult.empty();
      }
    });
}
export function wordUnit(
  wordUnit: TokiPona.WordUnit,
): IterableResult<WordUnitTranslation> {
  switch (wordUnit.type) {
    case "number":
      return number(wordUnit.words)
        .map((number): WordUnitTranslation => {
          const noun = numberAsText(number);
          return {
            type: "noun",
            determiners: [],
            adjectives: [],
            singular: {
              subject: noun,
              object: noun,
            },
            plural: null,
            reduplicationCount: 1,
            wordEmphasis: wordUnit.emphasis != null,
            perspective: "third",
            adjectiveName: null,
            postCompound: null,
            prepositions: [],
            phraseEmphasis: false,
            gerund: false,
          };
        });
    case "x ala x":
      return IterableResult.errors([new TranslationTodoError("x ala x")]);
    case "simple":
    case "reduplication": {
      const reduplicationCount = getReduplicationCount(wordUnit);
      return defaultWordUnit({
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
    case "simple":
    case "x ala x":
      return 1;
    case "reduplication":
      return wordUnit.count;
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
