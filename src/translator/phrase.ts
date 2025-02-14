import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { AdjectiveWithInWay, fixAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { findNumber, fixDeterminer } from "./determiner.ts";
import {
  ExhaustedError,
  FilteredOutError,
  TranslationTodoError,
} from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
import { AdjectivalModifier, AdverbialModifier, multipleModifiers } from "./modifier.ts";
import { nounForms, PartialNoun } from "./noun.ts";
import { PartialVerb } from "./verb.ts";
import { wordUnit } from "./word-unit.ts";
import { unemphasized } from "./word.ts";

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | ({ type: "adjective" } & AdjectiveWithInWay)
  | ({ type: "verb" } & PartialVerb);
function nounPhrase(
  emphasis: boolean,
  partialNoun: PartialNoun,
  modifier: AdjectivalModifier,
): Output<English.NounPhrase> {
  const determiner = fixDeterminer([
    ...modifier.determiner.slice().reverse(),
    ...partialNoun.determiner,
  ]);
  const quantity = findNumber(determiner);
  const adjective = fixAdjective([
    ...modifier.adjective.slice().reverse(),
    ...partialNoun.adjective,
  ]);
  let postAdjective: null | {
    adjective: string;
    name: string;
  };
  if (partialNoun.postAdjective != null && modifier.name != null) {
    return new Output();
  } else if (partialNoun.postAdjective != null) {
    postAdjective = partialNoun.postAdjective;
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
  const headNoun = nounForms(partialNoun.singular, partialNoun.plural, quantity)
    .map(({ noun, quantity }) => ({
      type: "simple" as const,
      determiner,
      adjective,
      noun: {
        word: repeatWithSpace(noun, partialNoun.reduplicationCount),
        emphasis: partialNoun.emphasis,
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
  return noun;
}
function adjectivePhrase(
  emphasis: boolean,
  adjective: English.AdjectivePhrase,
  modifier: AdverbialModifier,
): Output<AdjectiveWithInWay> {
  return Output.from(() => {
    switch (adjective.type) {
      case "simple": {
        const adverb = [
          ...modifier.adverb.slice().reverse(),
          ...adjective.adverb,
        ];
        if (adverb.length > 1) {
          throw new FilteredOutError("multiple adverbs");
        }
        return new Output([{
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
          return new Output([{
            adjective,
            inWayPhrase: modifier.inWayPhrase,
          }]);
        } else {
          return new Output();
        }
    }
  });
}
function defaultPhrase(
  phrase: TokiPona.Phrase & { type: "default" },
  place: "subject" | "object",
): Output<PhraseTranslation> {
  const emphasis = phrase.emphasis != null;
  return Output.combine(
    wordUnit(phrase.headWord, place),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap<PhraseTranslation>(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        return nounPhrase(emphasis, headWord, modifier)
          .map((noun) => ({ type: "noun", noun }));
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        return adjectivePhrase(emphasis, headWord.adjective, modifier).map(
          (adjective) => ({ type: "adjective", ...adjective }),
        );
      } else {
        return new Output();
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(phrase)));
}
export function phrase(
  phrase: TokiPona.Phrase,
  place: "subject" | "object",
): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return defaultPhrase(phrase, place);
    case "preverb":
    case "preposition":
    case "quotation":
      return new Output(new TranslationTodoError(phrase.type));
  }
}
export function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: "subject" | "object",
  andParticle: string,
): Output<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output.combine(
        ...phrases.phrases.map((phrases) =>
          multiplePhrases(phrases, place, andParticle)
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
          new ExhaustedError(Composer.multiplePhrases(phrases, andParticle))
        );
    }
  }
}
