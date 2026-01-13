import * as English from "./ast.ts";
import { number, numberAsText } from "./number.ts";
import * as TokiPona from "../parser/ast.ts";
import { IterableResult } from "../compound.ts";
import { ExhaustedError, TranslationTodoError } from "./error.ts";
import { dictionary } from "../dictionary.ts";
import { getReduplicationCount } from "./word_unit.ts";
import { noun } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as Composer from "../parser/composer.ts";
import { word } from "./word.ts";

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
  determiners: ReadonlyArray<English.Determiner>;
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
function modifier(modifier: TokiPona.Modifier) {
  switch (modifier.type) {
    case "simple":
      return defaultModifier(modifier.word);
    case "name":
      return IterableResult.single<ModifierTranslation>({
        type: "name",
        name: modifier.words,
      });
    case "pi":
    case "nanpa":
      return IterableResult.errors([new TranslationTodoError(modifier.type)]);
  }
}
export function multipleModifiers(
  modifiers: ReadonlyArray<TokiPona.Modifier>,
): IterableResult<MultipleModifierTranslation> {
  return IterableResult.combine(...modifiers.map(modifier))
    .flatMap((modifiers) => {
      const nouns = modifiers
        .flatMap((modifier) => modifier.type === "noun" ? [modifier.noun] : []);

      const nounPrepositions = modifiers
        .filter(({ type }) => type === "noun preposition") as ReadonlyArray<
          ModifierTranslation & { type: "noun preposition" }
        >;

      const determiners = modifiers.flatMap((modifier) =>
        modifier.type === "determiner" ? [modifier.determiner] : []
      );

      const adjectives = modifiers.flatMap((modifier) =>
        modifier.type === "adjective" ? [modifier.adjective] : []
      );

      const adverbs = modifiers.flatMap((modifier) =>
        modifier.type === "adverb" ? [modifier.adverb] : []
      );

      const names = modifiers
        .flatMap((modifier) => modifier.type === "name" ? [modifier.name] : []);

      let adjectival: IterableResult<MultipleModifierTranslation>;
      if (
        nounPrepositions.length <= 1 &&
        adverbs.length === 0 &&
        names.length <= 1
      ) {
        adjectival = IterableResult.single<MultipleModifierTranslation>({
          type: "adjectival",
          nounPreposition: nounPrepositions[0] ?? null,
          determiners,
          adjectives,
          name: names[0] ?? null,
          ofPhrase: nouns,
        });
      } else {
        adjectival = IterableResult.empty();
      }
      let adverbial: IterableResult<MultipleModifierTranslation>;
      if (
        nouns.length === 0 &&
        nounPrepositions.length === 0 &&
        determiners.length === 0 &&
        adjectives.length <= 1 &&
        names.length === 0
      ) {
        const inWayPhrase: null | English.NounPhrase = adjectives.length > 0
          ? {
            type: "simple",
            determiners: [],
            adjectives,
            singular: { subject: "way", object: "way" },
            plural: null,
            reduplicationCount: 1,
            wordEmphasis: false,
            perspective: "third",
            adjectiveName: null,
            postCompound: null,
            prepositions: [],
            phraseEmphasis: false,
          }
          : null;
        adverbial = IterableResult.single<MultipleModifierTranslation>({
          type: "adverbial",
          adverbs,
          inWayPhrase,
        });
      } else {
        adverbial = IterableResult.empty();
      }
      return IterableResult.concat(adjectival, adverbial);
    })
    .addErrorWhenNone(() =>
      new ExhaustedError(modifiers.map(Composer.modifier).join(" "))
    );
}
