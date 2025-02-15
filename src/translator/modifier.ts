import { dictionary } from "../dictionary.ts";
import { repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
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
import { phrase } from "./phrase.ts";
import { pronoun } from "./pronoun.ts";
import { unemphasized } from "./word.ts";

export type ModifierTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | { type: "noun preposition"; noun: English.NounPhrase; preposition: string }
  | { type: "adjective"; adjective: English.AdjectivePhrase }
  | { type: "determiner"; determiner: English.Determiner }
  | { type: "adverb"; adverb: English.Word }
  | { type: "name"; name: string }
  | { type: "in position phrase"; noun: English.NounPhrase };
export type AdjectivalModifier = {
  nounPreposition: null | { noun: English.NounPhrase; preposition: string };
  determiner: Array<English.Determiner>;
  adjective: Array<English.AdjectivePhrase>;
  name: null | string;
  ofPhrase: null | English.NounPhrase;
  inPositionPhrase: null | English.NounPhrase;
};
export type AdverbialModifier = {
  adverb: Array<English.Word>;
  inWayPhrase: null | English.NounPhrase;
};
export type MultipleModifierTranslation =
  | ({ type: "adjectival" } & AdjectivalModifier)
  | ({ type: "adverbial" } & AdverbialModifier);
function numberModifier(
  word: number,
  emphasis: boolean,
): ModifierTranslation {
  let quantity: English.Quantity;
  if (word === 1) {
    quantity = "singular";
  } else {
    quantity = "plural";
  }
  return {
    type: "determiner",
    determiner: {
      determiner: { word: `${word}`, emphasis },
      kind: "numeral",
      quantity,
    },
  };
}
export function defaultModifier(
  word: TokiPona.WordUnit,
): Output<ModifierTranslation> {
  const emphasis = word.emphasis != null;
  switch (word.type) {
    case "number":
      return new Output([numberModifier(word.number, emphasis)]);
    case "x ala x":
      return new Output(new TranslationTodoError("x ala x"));
    case "default":
    case "reduplication": {
      let reduplicationCount: number;
      switch (word.type) {
        case "default":
          reduplicationCount = 1;
          break;
        case "reduplication":
          reduplicationCount = word.count;
          break;
      }
      return new Output(dictionary[word.word].definitions)
        .flatMap((definition) => {
          switch (definition.type) {
            case "noun":
              return noun(definition, reduplicationCount, emphasis)
                .map<ModifierTranslation>((noun) => ({
                  type: "noun",
                  noun,
                }));
            case "noun preposition":
              return noun(definition.noun, reduplicationCount, emphasis)
                .map<ModifierTranslation>((noun) => ({
                  type: "noun preposition",
                  noun,
                  preposition: definition.preposition,
                }));
            case "personal pronoun":
              return pronoun(definition, reduplicationCount, emphasis, "object")
                .map((noun) => ({ type: "noun", noun }));
            case "determiner":
              return determiner(
                definition,
                reduplicationCount,
                word.emphasis != null,
              )
                .map<ModifierTranslation>((determiner) => ({
                  type: "determiner",
                  determiner,
                }));
            case "adjective":
              return adjective(definition, word.emphasis, reduplicationCount)
                .map<ModifierTranslation>((adjective) => ({
                  type: "adjective",
                  adjective,
                }));
            case "compound adjective":
              return compoundAdjective(
                definition.adjective,
                reduplicationCount,
                word.emphasis,
              )
                .map<ModifierTranslation>((adjective) => ({
                  type: "adjective",
                  adjective,
                }));
            case "adverb":
              return new Output<ModifierTranslation>([{
                type: "adverb",
                adverb: {
                  word: repeatWithSpace(definition.adverb, reduplicationCount),
                  emphasis,
                },
              }]);
            default:
              return new Output();
          }
        });
    }
  }
}
export function piModifier(
  insidePhrase: TokiPona.Phrase,
): Output<ModifierTranslation> {
  return phrase(insidePhrase, "object", true)
    .filter((modifier) =>
      modifier.type !== "noun" || modifier.noun.type !== "simple" ||
      modifier.noun.preposition.length === 0
    )
    .filter((modifier) =>
      modifier.type != "adjective" || modifier.inWayPhrase == null
    )
    .filter((modifier) => modifier.type !== "verb") as Output<
      ModifierTranslation
    >;
}
function nanpaModifier(
  nanpa: TokiPona.Modifier & { type: "nanpa" },
): Output<ModifierTranslation> {
  return phrase(nanpa.phrase, "object", true).map((phrase) => {
    if (phrase.type !== "noun") {
      throw new FilteredOutError(`${phrase.type} within "in position" phrase`);
    } else if (
      (phrase.noun as English.NounPhrase & { type: "simple" })
        .preposition.length > 0
    ) {
      throw new FilteredOutError('preposition within "in position" phrase');
    } else {
      return {
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
          postCompound: phrase.noun,
          postAdjective: null,
          preposition: [],
          emphasis: false,
        },
      };
    }
  });
}
function modifier(
  modifier: TokiPona.Modifier,
): Output<ModifierTranslation> {
  switch (modifier.type) {
    case "default":
      return defaultModifier(modifier.word);
    case "proper words":
      return new Output([{ type: "name", name: modifier.words }]);
    case "pi":
      return piModifier(modifier.phrase);
    case "nanpa":
      return nanpaModifier(modifier);
    case "quotation":
      return new Output(new TranslationTodoError(modifier.type));
  }
}
export function multipleModifiers(
  modifiers: Array<TokiPona.Modifier>,
): Output<MultipleModifierTranslation> {
  return Output.combine(...modifiers.map(modifier))
    .flatMap((modifiers) => {
      const noun = modifiers
        .filter((modifier) => modifier.type === "noun")
        .map((modifier) => modifier.noun);
      const nounPreposition = modifiers
        .filter((modifier) => modifier.type === "noun preposition");
      const determiner = modifiers
        .filter((modifier) => modifier.type === "determiner")
        .map((modifier) => modifier.determiner);
      const adjective = modifiers
        .filter((modifier) => modifier.type === "adjective")
        .map((modifier) => modifier.adjective);
      const adverb = modifiers
        .filter((modifier) => modifier.type === "adverb")
        .map((modifier) => modifier.adverb);
      const name = modifiers
        .filter((modifier) => modifier.type === "name")
        .map((modifier) => modifier.name);
      const inPositionPhrase = modifiers
        .filter((modifier) => modifier.type === "in position phrase")
        .map((modifier) => modifier.noun);
      let adjectival: Output<MultipleModifierTranslation>;
      if (
        noun.length <= 1 &&
        nounPreposition.length <= 1 &&
        adverb.length === 0 &&
        name.length <= 1 &&
        inPositionPhrase.length <= 1 &&
        (noun.length === 0 || inPositionPhrase.length === 0)
      ) {
        adjectival = new Output<MultipleModifierTranslation>([{
          type: "adjectival",
          nounPreposition: nounPreposition[0] ?? null,
          determiner,
          adjective,
          name: name[0] ?? null,
          ofPhrase: noun[0] ?? null,
          inPositionPhrase: inPositionPhrase[0] ?? null,
        }]);
      } else {
        adjectival = new Output();
      }
      let adverbial: Output<MultipleModifierTranslation>;
      if (
        noun.length === 0 &&
        nounPreposition.length === 0 &&
        determiner.length === 0 &&
        adjective.length <= 1 &&
        name.length === 0 &&
        inPositionPhrase.length === 0
      ) {
        let inWayPhrase: null | English.NounPhrase;
        if (adjective.length > 0) {
          inWayPhrase = {
            type: "simple",
            determiner: [],
            adjective,
            noun: unemphasized("way"),
            quantity: "singular",
            postAdjective: null,
            preposition: [],
            emphasis: false,
          };
        } else {
          inWayPhrase = null;
        }
        adverbial = new Output<MultipleModifierTranslation>([{
          type: "adverbial",
          adverb,
          inWayPhrase,
        }]);
      } else {
        adverbial = new Output();
      }
      return Output.concat(adjectival, adverbial);
    })
    .addErrorWhenNone(() =>
      new ExhaustedError(modifiers.map(Composer.modifier).join(" "))
    );
}
