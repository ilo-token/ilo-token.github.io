import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { determiner } from "./determiner.ts";
import { ExhaustedError, TranslationTodoError } from "./error.ts";
import { nanpa } from "./nanpa.ts";
import { noun } from "./noun.ts";
import { number, numberAsText } from "./number.ts";
import { phrase, PhraseTranslation } from "./phrase.ts";
import { pronoun } from "./pronoun.ts";
import { noEmphasis, word } from "./word.ts";
import { getReduplicationCount } from "./word_unit.ts";

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
  | Readonly<{ type: "name"; name: string }>
  | Readonly<{ type: "position phrase"; noun: English.NounPhrase }>;
export type AdjectivalModifier = Readonly<{
  nounPreposition:
    | null
    | Readonly<{ noun: English.NounPhrase; preposition: string }>;
  determiners: ReadonlyArray<English.Determiner>;
  adjectives: ReadonlyArray<English.AdjectivePhrase>;
  name: null | string;
  ofPhrase: null | English.NounPhrase;
  inPositionPhrase: null | English.NounPhrase;
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
            determiner: word({
              word: numberAsText(number),
              reduplicationCount: 1,
              emphasis,
            }),
            kind: "numeral",
            quantity,
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
        .flatMap((definition) => {
          switch (definition.type) {
            case "noun":
              return noun({ definition, reduplicationCount, emphasis })
                .map((noun): ModifierTranslation => ({
                  type: "noun",
                  noun,
                }));
            case "noun preposition":
              return noun({
                definition: definition.noun,
                reduplicationCount,
                emphasis,
              })
                .map((noun): ModifierTranslation => ({
                  type: "noun preposition",
                  noun,
                  preposition: definition.preposition,
                }));
            case "personal pronoun":
              return pronoun({
                definition,
                reduplicationCount,
                emphasis,
                place: "object",
              })
                .map((noun): ModifierTranslation => ({ type: "noun", noun }));
            case "determiner":
              return determiner({
                definition,
                reduplicationCount,
                emphasis: wordUnit.emphasis != null,
              })
                .map((determiner): ModifierTranslation => ({
                  type: "determiner",
                  determiner,
                }));
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
function pi(
  insidePhrase: TokiPona.Phrase,
): IterableResult<ModifierTranslation> {
  return phrase({
    phrase: insidePhrase,
    place: "object",
    includeGerund: true,
    includeVerb: false,
  })
    .filter((modifier) =>
      modifier.type !== "noun" || modifier.noun.type !== "simple" ||
      modifier.noun.prepositions.length === 0
    )
    .filter((modifier) =>
      modifier.type !== "adjective" || modifier.inWayPhrase == null
    ) as IterableResult<
      PhraseTranslation & { type: Exclude<PhraseTranslation["type"], "verb"> }
    >;
}
function modifier(modifier: TokiPona.Modifier) {
  switch (modifier.type) {
    case "simple":
      return defaultModifier(modifier.word);
    case "proper words":
      return IterableResult.single<ModifierTranslation>({
        type: "name",
        name: modifier.words,
      });
    case "pi":
      return pi(modifier.phrase);
    case "nanpa":
      return nanpa(modifier)
        .map((noun): ModifierTranslation => ({
          type: "position phrase",
          noun,
        }));
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

      const inPositionPhrases = modifiers.flatMap((modifier) =>
        modifier.type === "position phrase" ? [modifier.noun] : []
      );

      let adjectival: IterableResult<MultipleModifierTranslation>;
      if (
        nouns.length <= 1 &&
        nounPrepositions.length <= 1 &&
        adverbs.length === 0 &&
        names.length <= 1 &&
        inPositionPhrases.length <= 1 &&
        (nouns.length === 0 || inPositionPhrases.length === 0)
      ) {
        adjectival = IterableResult.single({
          type: "adjectival",
          nounPreposition: nounPrepositions[0] ?? null,
          determiners,
          adjectives,
          name: names[0] ?? null,
          ofPhrase: nouns[0] ?? null,
          inPositionPhrase: inPositionPhrases[0] ?? null,
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
        names.length === 0 &&
        inPositionPhrases.length === 0
      ) {
        const inWayPhrase: null | English.NounPhrase = adjectives.length > 0
          ? {
            type: "simple",
            determiners: [],
            adjectives,
            noun: noEmphasis("way"),
            quantity: "singular",
            perspective: "third",
            postAdjective: null,
            postCompound: null,
            prepositions: [],
            emphasis: false,
          }
          : null;
        adverbial = IterableResult.single({
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
