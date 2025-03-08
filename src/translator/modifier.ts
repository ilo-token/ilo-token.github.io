import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import { throwError } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { determiner } from "./determiner.ts";
import {
  ExhaustedError,
  FilteredOutError,
  TranslationTodoError,
} from "./error.ts";
import { noun } from "./noun.ts";
import { number } from "./number.ts";
import { phrase } from "./phrase.ts";
import { pronoun } from "./pronoun.ts";
import { unemphasized, word } from "./word.ts";
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
  | Readonly<{ type: "adverb"; adverb: English.Word }>
  | Readonly<{ type: "name"; name: string }>
  | Readonly<{ type: "in position phrase"; noun: English.NounPhrase }>;
export type AdjectivalModifier = Readonly<{
  nounPreposition:
    | null
    | Readonly<{ noun: English.NounPhrase; preposition: string }>;
  determiner: ReadonlyArray<English.Determiner>;
  adjective: ReadonlyArray<English.AdjectivePhrase>;
  name: null | string;
  ofPhrase: null | English.NounPhrase;
  inPositionPhrase: null | English.NounPhrase;
}>;
export type AdverbialModifier = Readonly<{
  adverb: ReadonlyArray<English.Word>;
  inWayPhrase: null | English.NounPhrase;
}>;
export type MultipleModifierTranslation =
  | (Readonly<{ type: "adjectival" }> & AdjectivalModifier)
  | (Readonly<{ type: "adverbial" }> & AdverbialModifier);
export function defaultModifier(
  wordUnit: TokiPona.WordUnit,
): ArrayResult<ModifierTranslation> {
  const emphasis = wordUnit.emphasis != null;
  switch (wordUnit.type) {
    case "number":
      return number(wordUnit.words).map<ModifierTranslation>((number) => {
        const quantity = number === 1 ? "singular" : "plural";
        return {
          type: "determiner" as const,
          determiner: {
            determiner: word({
              word: `${number}`,
              reduplicationCount: 1,
              emphasis,
            }),
            kind: "numeral",
            quantity,
          },
        };
      });
    case "x ala x":
      return new ArrayResult(new TranslationTodoError("x ala x"));
    case "default":
    case "reduplication": {
      const reduplicationCount = getReduplicationCount(wordUnit);
      return new ArrayResult(dictionary.get(wordUnit.word)!.definitions)
        .flatMap((definition) => {
          switch (definition.type) {
            case "noun":
              return noun({ definition, reduplicationCount, emphasis })
                .map<ModifierTranslation>((noun) => ({
                  type: "noun",
                  noun,
                }));
            case "noun preposition":
              return noun({
                definition: definition.noun,
                reduplicationCount,
                emphasis,
              })
                .map<ModifierTranslation>((noun) => ({
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
                .map((noun) => ({ type: "noun", noun }));
            case "determiner":
              return determiner({
                definition,
                reduplicationCount,
                emphasis: wordUnit.emphasis != null,
              })
                .map<ModifierTranslation>((determiner) => ({
                  type: "determiner",
                  determiner,
                }));
            case "adjective":
              return adjective({
                definition,
                reduplicationCount,
                emphasis: wordUnit.emphasis,
              })
                .map<ModifierTranslation>((adjective) => ({
                  type: "adjective",
                  adjective,
                }));
            case "compound adjective":
              return compoundAdjective({
                adjectives: definition.adjective,
                reduplicationCount,
                emphasis: wordUnit.emphasis,
              })
                .map<ModifierTranslation>((adjective) => ({
                  type: "adjective",
                  adjective,
                }));
            case "adverb":
              return new ArrayResult<ModifierTranslation>([{
                type: "adverb",
                adverb: word({
                  word: definition.adverb,
                  reduplicationCount,
                  emphasis,
                }),
              }]);
            default:
              return new ArrayResult();
          }
        });
    }
  }
}
export function piModifier(
  insidePhrase: TokiPona.Phrase,
): ArrayResult<ModifierTranslation> {
  return phrase({
    phrase: insidePhrase,
    place: "object",
    includeGerund: true,
    includeVerb: false,
  })
    .filter((modifier) =>
      modifier.type !== "noun" || modifier.noun.type !== "simple" ||
      modifier.noun.preposition.length === 0
    )
    .filter((modifier) =>
      modifier.type !== "adjective" || modifier.inWayPhrase == null
    ) as ArrayResult<ModifierTranslation>;
}
function nanpaModifier(
  nanpa: TokiPona.Modifier & { type: "nanpa" },
): ArrayResult<ModifierTranslation> {
  return phrase({
    phrase: nanpa.phrase,
    place: "object",
    includeGerund: true,
    includeVerb: false,
  })
    .map((phrase) =>
      phrase.type !== "noun"
        ? throwError(
          new FilteredOutError(
            `${phrase.type} within "in position" phrase`,
          ),
        )
        : (phrase.noun as English.NounPhrase & { type: "simple" })
            .preposition.length > 0
        ? throwError(
          new FilteredOutError('preposition within "in position" phrase'),
        )
        : {
          type: "in position phrase",
          noun: {
            type: "simple",
            determiner: [],
            adjective: [],
            noun: {
              word: "position",
              emphasis: nanpa.nanpa.emphasis != null,
            },
            quantity: "singular",
            perspective: "third",
            postCompound: phrase.noun,
            postAdjective: null,
            preposition: [],
            emphasis: false,
          },
        }
    );
}
function modifier(
  modifier: TokiPona.Modifier,
): ArrayResult<ModifierTranslation> {
  switch (modifier.type) {
    case "default":
      return defaultModifier(modifier.word);
    case "proper words":
      return new ArrayResult([{ type: "name", name: modifier.words }]);
    case "pi":
      return piModifier(modifier.phrase);
    case "nanpa":
      return nanpaModifier(modifier);
  }
}
export function multipleModifiers(
  modifiers: ReadonlyArray<TokiPona.Modifier>,
): ArrayResult<MultipleModifierTranslation> {
  return ArrayResult.combine(...modifiers.map(modifier))
    .flatMap((modifiers) => {
      const noun = modifiers
        .flatMap((modifier) => modifier.type === "noun" ? [modifier.noun] : []);

      const nounPreposition = modifiers
        .filter(({ type }) => type === "noun preposition") as ReadonlyArray<
          ModifierTranslation & { type: "noun preposition" }
        >;

      const determiner = modifiers.flatMap((modifier) =>
        modifier.type === "determiner" ? [modifier.determiner] : []
      );

      const adjective = modifiers.flatMap((modifier) =>
        modifier.type === "adjective" ? [modifier.adjective] : []
      );

      const adverb = modifiers.flatMap((modifier) =>
        modifier.type === "adverb" ? [modifier.adverb] : []
      );

      const name = modifiers
        .flatMap((modifier) => modifier.type === "name" ? [modifier.name] : []);

      const inPositionPhrase = modifiers.flatMap((modifier) =>
        modifier.type === "in position phrase" ? [modifier.noun] : []
      );

      let adjectival: ArrayResult<MultipleModifierTranslation>;
      if (
        noun.length <= 1 &&
        nounPreposition.length <= 1 &&
        adverb.length === 0 &&
        name.length <= 1 &&
        inPositionPhrase.length <= 1 &&
        (noun.length === 0 || inPositionPhrase.length === 0)
      ) {
        adjectival = new ArrayResult<MultipleModifierTranslation>([{
          type: "adjectival",
          nounPreposition: nounPreposition[0] ?? null,
          determiner,
          adjective,
          name: name[0] ?? null,
          ofPhrase: noun[0] ?? null,
          inPositionPhrase: inPositionPhrase[0] ?? null,
        }]);
      } else {
        adjectival = new ArrayResult();
      }
      let adverbial: ArrayResult<MultipleModifierTranslation>;
      if (
        noun.length === 0 &&
        nounPreposition.length === 0 &&
        determiner.length === 0 &&
        adjective.length <= 1 &&
        name.length === 0 &&
        inPositionPhrase.length === 0
      ) {
        const inWayPhrase: null | English.NounPhrase = adjective.length > 0
          ? {
            type: "simple",
            determiner: [],
            adjective,
            noun: unemphasized("way"),
            quantity: "singular",
            perspective: "third",
            postAdjective: null,
            preposition: [],
            emphasis: false,
          }
          : null;
        adverbial = new ArrayResult<MultipleModifierTranslation>([{
          type: "adverbial",
          adverb,
          inWayPhrase,
        }]);
      } else {
        adverbial = new ArrayResult();
      }
      return ArrayResult.concat(adjectival, adverbial);
    })
    .addErrorWhenNone(() =>
      new ExhaustedError(modifiers.map(Composer.modifier).join(" "))
    );
}
