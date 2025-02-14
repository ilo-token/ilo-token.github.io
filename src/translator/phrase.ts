import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { fixAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { findNumber, fixDeterminer } from "./determiner.ts";
import {
  ExhaustedError,
  FilteredOutError,
  TranslationTodoError,
} from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
import { multipleModifiers, MultipleModifierTranslation } from "./modifier.ts";
import { nounForms } from "./noun.ts";
import { wordUnit, WordUnitTranslation } from "./word-unit.ts";
import { unemphasized } from "./word.ts";

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | {
    type: "adjective";
    adjective: English.AdjectivePhrase;
    inWayPhrase: null | English.NounPhrase;
  }
  | { type: "verb"; verb: English.VerbPhrase };
function nounPhrase(
  emphasis: boolean,
  headWord: WordUnitTranslation & { type: "noun" },
  modifier: MultipleModifierTranslation & { type: "adjectival" },
): Output<PhraseTranslation & { type: "noun" }> {
  const determiner = fixDeterminer([
    ...modifier.determiner.slice().reverse(),
    ...headWord.determiner,
  ]);
  const quantity = findNumber(determiner);
  const adjective = fixAdjective([
    ...modifier.adjective.slice().reverse(),
    ...headWord.adjective,
  ]);
  let postAdjective: null | {
    adjective: string;
    name: string;
  };
  if (headWord.postAdjective != null && modifier.name != null) {
    return new Output();
  } else if (headWord.postAdjective != null) {
    postAdjective = headWord.postAdjective;
  } else if (modifier.name != null) {
    postAdjective = { adjective: "named", name: modifier.name };
  } else {
    postAdjective = null;
  }
  const preposition = [
    ...nullableAsArray(modifier.inPositionPhrase)
      .map((object) => ({
        preposition: unemphasized("in"),
        object,
      })),
    ...nullableAsArray(modifier.ofPhrase)
      .map((object) => ({
        preposition: unemphasized("of"),
        object,
      })),
  ];
  if (
    preposition.length > 1 ||
    (preposition.length > 0 && postAdjective != null)
  ) {
    return new Output();
  }
  const headNoun = nounForms(headWord.singular, headWord.plural, quantity)
    .map(({ noun, quantity }) => ({
      type: "simple" as const,
      determiner,
      adjective,
      noun: {
        word: repeatWithSpace(noun, headWord.reduplicationCount),
        emphasis: headWord.emphasis,
      },
      quantity,
      postCompound: null,
      postAdjective,
      preposition,
      emphasis: emphasis &&
        modifier.nounPreposition == null,
    }));
  let noun: Output<English.NounPhrase>;
  if (modifier.nounPreposition == null) {
    noun = headNoun;
  } else if (
    modifier.ofPhrase == null && modifier.inPositionPhrase == null
  ) {
    noun = headNoun.map((noun) => ({
      ...modifier.nounPreposition!.noun as English.NounPhrase & {
        type: "simple";
      },
      preposition: [{
        preposition: unemphasized(modifier.nounPreposition!.preposition),
        object: noun,
      }],
      emphasis,
    }));
  } else {
    noun = new Output();
  }
  return noun
    .map<PhraseTranslation & { type: "noun" }>(
      (noun) => ({ type: "noun", noun }),
    );
}
function adjectivePhrase(
  emphasis: boolean,
  headWord: WordUnitTranslation & { type: "adjective" },
  modifier: MultipleModifierTranslation & { type: "adverbial" },
): Output<PhraseTranslation & { type: "adjective" }> {
  const adjective = headWord.adjective;
  switch (adjective.type) {
    case "simple": {
      const adverb = [
        ...modifier.adverb.slice().reverse(),
        ...adjective.adverb,
      ];
      if (adverb.length > 1) {
        throw new FilteredOutError("multiple adverbs");
      }
      return new Output<PhraseTranslation & { type: "adjective" }>([{
        type: "adjective",
        adjective: {
          ...adjective,
          adverb,
          emphasis,
        },
        inWayPhrase: modifier.inWayPhrase,
      }]);
    }
    case "compound":
      if (modifier.adverb.length === 0) {
        return new Output<PhraseTranslation & { type: "adjective" }>([{
          type: "adjective",
          adjective,
          inWayPhrase: modifier.inWayPhrase,
        }]);
      } else {
        return new Output();
      }
  }
}
function defaultPhrase(
  phrase: TokiPona.Phrase & { type: "default" },
  place: "subject" | "object",
  subjectQuantity: null | English.Quantity,
): Output<PhraseTranslation> {
  const emphasis = phrase.emphasis != null;
  return Output.combine(
    wordUnit(phrase.headWord, place, subjectQuantity),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap<PhraseTranslation>(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        return nounPhrase(emphasis, headWord, modifier);
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        return adjectivePhrase(emphasis, headWord, modifier);
      } else {
        return new Output();
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(phrase)));
}
export function phrase(
  phrase: TokiPona.Phrase,
  place: "subject" | "object",
  subjectQuantity: null | English.Quantity,
): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return defaultPhrase(phrase, place, subjectQuantity);
    case "preverb":
    case "preposition":
    case "quotation":
      return new Output(new TranslationTodoError(phrase.type));
  }
}
export function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: "subject" | "object",
  subjectQuantity: null | English.Quantity,
  particle: string,
): Output<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place, subjectQuantity);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output
        .combine(
          ...phrases.phrases.map((phrases) =>
            multiplePhrases(phrases, place, subjectQuantity, particle)
          ),
        )
        .filterMap<PhraseTranslation | null>((phrase) => {
          if (phrase.every((phrase) => phrase.type === "noun")) {
            const nouns = phrase
              .map((noun) => noun.noun)
              .flatMap((noun) => {
                if (
                  noun.type === "compound" &&
                  noun.conjunction === conjunction
                ) {
                  return noun.nouns;
                } else {
                  return [noun];
                }
              });
            let quantity: English.Quantity;
            switch (conjunction) {
              case "and":
                quantity = "plural";
                break;
              case "or":
                quantity = nouns[nouns.length - 1].quantity;
                break;
            }
            return {
              type: "noun",
              noun: {
                type: "compound",
                conjunction,
                nouns,
                preposition: [],
                quantity,
              },
            };
          } else if (
            phrases.type === "anu" &&
            phrase.every((phrase) =>
              phrase.type === "adjective" && phrase.inWayPhrase == null
            )
          ) {
            return {
              type: "adjective",
              adjective: {
                type: "compound",
                conjunction,
                adjective: phrase
                  .map((adjective) =>
                    (adjective as PhraseTranslation & { type: "adjective" })
                      .adjective
                  )
                  .flatMap((adjective) => {
                    if (
                      adjective.type === "compound" &&
                      adjective.conjunction === conjunction
                    ) {
                      return adjective.adjective;
                    } else {
                      return [adjective];
                    }
                  }),
                emphasis: false,
              },
              inWayPhrase: null,
            };
          } else {
            return null;
          }
        })
        .addErrorWhenNone(() =>
          new ExhaustedError(Composer.multiplePhrases(phrases, particle))
        );
    }
  }
}
