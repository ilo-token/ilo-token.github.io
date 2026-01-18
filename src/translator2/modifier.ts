import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary/dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { ExhaustedError, TranslationTodoError } from "./error.ts";
import { nanpa } from "./nanpa.ts";
import { noun } from "./noun.ts";
import { number, numberAsText } from "./number.ts";
import { phrase, PhraseTranslation } from "./phrase.ts";
import { pronoun } from "./pronoun.ts";
import { word } from "./word.ts";
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
  | Readonly<{ type: "name"; name: string }>;
type RawMultipleModifierTranslation = Readonly<{
  nounPrepositions: ReadonlyArray<
    Readonly<{ noun: English.NounPhrase; preposition: string }>
  >;
  determiners: ReadonlyArray<English.Determiner>;
  adjectives: ReadonlyArray<English.AdjectivePhrase>;
  names: ReadonlyArray<string>;
  nouns: ReadonlyArray<English.NounPhrase>;
  adverbs: ReadonlyArray<English.Adverb>;
}>;
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
  inWayPhrase: null | English.AdjectivePhrase;
}>;
export type MultipleModifierTranslation = Readonly<{
  adjectival: AdjectivalModifier;
  adverbial: AdverbialModifier;
}>;
export function adjectivalIsNone(modifier: AdjectivalModifier): boolean {
  return modifier.nounPreposition == null &&
    modifier.determiners.length === 0 && modifier.adjectives.length === 0 &&
    modifier.name == null && modifier.ofPhrase.length === 0;
}
export function adverbialIsNone(modifier: AdverbialModifier): boolean {
  return modifier.adverbs.length === 0 && modifier.inWayPhrase == null;
}
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
function pi(
  insidePhrase: TokiPona.Phrase,
): IterableResult<ModifierTranslation> {
  return phrase({
    phrase: insidePhrase,
    includeGerund: true,
  })
    .filter((modifier) =>
      modifier.type !== "verb" &&
      (modifier.type !== "adjective" || modifier.inWayPhrase == null) &&
      (modifier.type !== "noun" || adverbialIsNone(modifier.adverbialModifier))
    ) as IterableResult<
      PhraseTranslation & { type: Exclude<PhraseTranslation["type"], "verb"> }
    >;
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
      return pi(modifier.phrase);
    case "nanpa":
      return nanpa(modifier)
        .map((noun): ModifierTranslation => ({
          type: "noun",
          noun: { ...noun, type: "simple" },
        }));
  }
}
function rawMultipleModifier(
  modifiers: ReadonlyArray<ModifierTranslation>,
): RawMultipleModifierTranslation {
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

  return {
    nouns,
    nounPrepositions,
    determiners,
    adjectives,
    adverbs,
    names,
  };
}
function adjectivalModifier(
  modifiers: ReadonlyArray<ModifierTranslation>,
): null | AdjectivalModifier {
  const raw = rawMultipleModifier(modifiers);
  if (
    raw.nounPrepositions.length <= 1 &&
    raw.adverbs.length === 0 &&
    raw.names.length <= 1
  ) {
    return {
      nounPreposition: raw.nounPrepositions[0] ?? null,
      determiners: raw.determiners,
      adjectives: raw.adjectives,
      name: raw.names[0] ?? null,
      ofPhrase: raw.nouns,
    };
  } else {
    return null;
  }
}
function adverbialModifier(
  modifiers: ReadonlyArray<ModifierTranslation>,
): null | AdverbialModifier {
  const raw = rawMultipleModifier(modifiers);
  if (
    raw.nouns.length === 0 &&
    raw.nounPrepositions.length === 0 &&
    raw.determiners.length === 0 &&
    raw.adjectives.length <= 1 &&
    raw.names.length === 0
  ) {
    return {
      adverbs: raw.adverbs,
      inWayPhrase: raw.adjectives.length > 0 ? raw.adjectives[0] : null,
    };
  } else {
    return null;
  }
}
export function multipleModifiers(
  modifiers: ReadonlyArray<TokiPona.Modifier>,
): IterableResult<MultipleModifierTranslation> {
  return IterableResult.combine(...modifiers.map(modifier))
    .flatMap(combinationOnTwo)
    .filterMap(([forAdjectival, forAdverbial]) => {
      const adjectival = adjectivalModifier(forAdjectival);
      const adverbial = adverbialModifier(forAdverbial);
      if (adjectival == null || adverbial == null) {
        return null;
      } else {
        return { adjectival, adverbial };
      }
    })
    .addErrorWhenNone(() =>
      new ExhaustedError(modifiers.map(Composer.modifier).join(" "))
    );
}
function combinationOnTwo<T>(
  array: ReadonlyArray<T>,
): IterableResult<readonly [ReadonlyArray<T>, ReadonlyArray<T>]> {
  if (array.length == 0) {
    return IterableResult.single([[], []]);
  } else {
    const init = array.slice(0, array.length - 1);
    const last = array[array.length - 1];
    return combinationOnTwo(init)
      .flatMap(([left, right]) =>
        IterableResult.fromArray([
          [[...left, last], right],
          [left, [...right, last]],
        ])
      );
  }
}
