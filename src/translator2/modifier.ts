import * as Dictionary from "../../dictionary/type.ts";
import * as English from "./ast.ts";
import { number, numberAsText } from "./number.ts";
import { word } from "./word.ts";
import * as TokiPona from "../parser/ast.ts";
import { IterableResult } from "../compound.ts";
import { TranslationTodoError } from "./error.ts";
import { dictionary } from "../dictionary.ts";
import { getReduplicationCount } from "./word_unit.ts";
import { noun } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { adjective, compoundAdjective } from "./adjective.ts";

export type ModifierTranslation =
  | Readonly<{ type: "noun"; noun: English.NounPhrase }>
  | Readonly<{
    type: "noun preposition";
    noun: English.NounPhrase;
    preposition: string;
  }>
  | Readonly<{ type: "adjective"; adjective: English.AdjectivePhrase }>
  | Readonly<{ type: "determiner"; determiner: English.Determiner }>
  | Readonly<{ type: "adverb"; adverb: English.Adverb }>
  | Readonly<{ type: "name"; name: string }>;
export type AdjectivalModifier = Readonly<{
  nounPreposition:
    | null
    | Readonly<{ noun: English.NounPhrase; preposition: string }>;
  determiners: ReadonlyArray<Dictionary.Determiner>;
  adjectives: ReadonlyArray<English.AdjectivePhrase>;
  name: null | string;
  ofPhrase: ReadonlyArray<English.NounPhrase>;
}>;
export type AdverbialModifier = Readonly<{
  adverbs: ReadonlyArray<English.Adverb>;
  inWayPhrase: null | English.NounPhrase;
}>;
export type MultipleModifierTranslation =
  | (Readonly<{ type: "adjectival" }> & AdjectivalModifier)
  | (Readonly<{ type: "adverbial" }> & AdverbialModifier);
function defaultModifier(wordUnit: TokiPona.WordUnit) {
  const emphasis = wordUnit.emphasis != null;
  switch (wordUnit.type) {
    case "number":
      return number(wordUnit.words).map((number): ModifierTranslation => {
        const quantity = number === 1 ? "singular" : "plural";
        return {
          type: "determiner",
          determiner: {
            determiner: numberAsText(number),
            plural: null,
            kind: "numeral",
            quantity,
            reduplicationCount: 1,
            emphasis,
          },
        };
      });
    case "x ala x":
      return IterableResult.errors([new TranslationTodoError("x ala x")]);
    case "simple":
    case "reduplication": {
      const reduplicationCount = getReduplicationCount(wordUnit);
      return IterableResult.fromArray(
        dictionary.get(wordUnit.word)!.definitions,
      )
        .flatMap((definition): IterableResult<ModifierTranslation> => {
          switch (definition.type) {
            case "noun":
              return noun({ definition, reduplicationCount, emphasis })
                .map((noun): ModifierTranslation => ({
                  type: "noun",
                  noun: { ...noun, type: "simple" },
                }));
            case "noun preposition":
              return noun({
                definition: definition.noun,
                reduplicationCount,
                emphasis,
              })
                .map((noun): ModifierTranslation => ({
                  type: "noun preposition",
                  noun: { ...noun, type: "simple" },
                  preposition: definition.preposition,
                }));
            case "personal pronoun":
              return IterableResult.single({
                type: "noun",
                noun: {
                  ...pronoun({
                    pronoun: definition,
                    reduplicationCount,
                    emphasis,
                  }),
                  type: "simple",
                },
              });
            case "determiner":
              return IterableResult.single({
                type: "determiner",
                determiner: {
                  ...definition,
                  emphasis,
                  reduplicationCount,
                },
              });
            case "adjective":
              return adjective({
                definition,
                reduplicationCount,
                emphasis: wordUnit.emphasis,
              })
                .map((adjective): ModifierTranslation => ({
                  type: "adjective",
                  adjective,
                }));
            case "compound adjective":
              return compoundAdjective({
                adjectives: definition.adjectives,
                reduplicationCount,
                emphasis: wordUnit.emphasis,
              })
                .map((adjective): ModifierTranslation => ({
                  type: "adjective",
                  adjective,
                }));
            case "adverb":
              return IterableResult.single<ModifierTranslation>({
                type: "adverb",
                adverb: {
                  adverb: word({
                    word: definition.adverb,
                    reduplicationCount,
                    emphasis,
                  }),
                  negative: definition.negative,
                },
              });
            default:
              return IterableResult.empty();
          }
        });
    }
  }
}
