import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { AdjectiveWithInWay, fixAdjective } from "./adjective.ts";
import { fixAdverb } from "./adverb.ts";
import * as English from "./ast.ts";
import { findNumber, fixDeterminer } from "./determiner.ts";
import {
  ExhaustedError,
  FilteredOutError,
  TranslationTodoError,
} from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
import {
  AdjectivalModifier,
  AdverbialModifier,
  multipleModifiers,
} from "./modifier.ts";
import { nounForms, PartialNoun } from "./noun.ts";
import { PartialCompoundVerb, PartialVerb } from "./verb.ts";
import { wordUnit } from "./word-unit.ts";
import { unemphasized } from "./word.ts";

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | ({ type: "adjective" } & AdjectiveWithInWay)
  | ({ type: "verb" } & PartialVerb);
type MultiplePhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | ({ type: "adjective" } & AdjectiveWithInWay)
  | ({ type: "verb"; verb: PartialCompoundVerb });
function nounPhrase(
  emphasis: boolean,
  partialNoun: PartialNoun,
  modifier: AdjectivalModifier,
): Output<English.NounPhrase> {
  return Output.from(() => {
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
      throw new FilteredOutError("double name");
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
      throw new FilteredOutError("multiple preposition within noun phrase");
    }
    const headNoun = nounForms(
      partialNoun.singular,
      partialNoun.plural,
      quantity,
    )
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
    if (modifier.nounPreposition == null) {
      return headNoun;
    } else if (
      modifier.ofPhrase == null && modifier.inPositionPhrase == null
    ) {
      return headNoun.map<English.NounPhrase>((noun) => ({
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
      // will be filled by ExhaustedError on `defaultPhrase`
      return new Output();
    }
  });
}
function adjectivePhrase(
  emphasis: boolean,
  adjective: English.AdjectivePhrase,
  modifier: AdverbialModifier,
): AdjectiveWithInWay {
  switch (adjective.type) {
    case "simple": {
      const adverb = fixAdverb([
        ...modifier.adverb.slice().reverse(),
        ...adjective.adverb,
      ]);
      return {
        adjective: {
          ...adjective,
          adverb,
          emphasis,
        },
        inWayPhrase: modifier.inWayPhrase,
      };
    }
    case "compound":
      if (modifier.adverb.length === 0) {
        return {
          adjective,
          inWayPhrase: modifier.inWayPhrase,
        };
      } else {
        throw new FilteredOutError("adverb with compound adjective");
      }
  }
}
function verbPhrase(
  emphasis: boolean,
  verb: PartialVerb,
  modifier: AdverbialModifier,
): PartialVerb {
  const adverb = fixAdverb([
    ...modifier.adverb.slice().reverse(),
    ...verb.adverb,
  ]);
  const preposition = [
    ...verb.preposition,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) => ({ preposition: unemphasized("in"), object })),
  ];
  return {
    ...verb,
    adverb,
    phraseEmphasis: emphasis,
    preposition,
  };
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
        return new Output([{
          ...adjectivePhrase(emphasis, headWord.adjective, modifier),
          type: "adjective",
        }]);
      } else if (headWord.type === "verb" && modifier.type === "adverbial") {
        return new Output([{
          ...verbPhrase(emphasis, headWord, modifier),
          type: "verb",
        }]);
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
function compoundNoun(
  conjunction: "and" | "or",
  phrase: Array<English.NounPhrase>,
): English.NounPhrase {
  const nouns = phrase
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
    type: "compound",
    conjunction,
    nouns,
    quantity,
  };
}
function compoundAdjective(
  conjunction: "and" | "or",
  phrase: Array<English.AdjectivePhrase>,
): English.AdjectivePhrase {
  return {
    type: "compound",
    conjunction,
    adjective: phrase
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
  };
}
function compoundVerb(
  conjunction: "and" | "or",
  phrase: Array<MultiplePhraseTranslation>,
): PartialCompoundVerb {
  return {
    type: "compound",
    conjunction,
    verb: phrase.map<PartialCompoundVerb>((phrase) => {
      switch (phrase.type) {
        case "noun":
        case "adjective": {
          let subjectComplement: English.SubjectComplement;
          switch (phrase.type) {
            case "noun":
              subjectComplement = {
                type: "noun",
                noun: phrase.noun,
              };
              break;
            case "adjective":
              subjectComplement = {
                type: "adjective",
                adjective: phrase.adjective,
              };
              break;
          }
          return {
            type: "simple",
            adverb: [],
            presentPlural: "is",
            presentSingular: "are",
            past: "was",
            wordEmphasis: false,
            reduplicationCount: 1,
            subjectComplement,
            object: null,
            preposition: [],
            forObject: false,
            predicateType: null,
            phraseEmphasis: false,
          };
        }
        case "verb":
          return phrase.verb;
      }
    }),
  };
}
export function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: "subject" | "object",
  andParticle: string,
): Output<MultiplePhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place)
        .map<MultiplePhraseTranslation>((phrase) => {
          if (phrase.type === "verb") {
            return { type: "verb", verb: { ...phrase, type: "simple" } };
          } else {
            return phrase;
          }
        });
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output.combine(
        ...phrases.phrases
          .map((phrases) => multiplePhrases(phrases, place, andParticle)),
      )
        .filterMap<null | MultiplePhraseTranslation>((phrase) => {
          if (
            phrase.some((phrase) =>
              phrase.type === "adjective" && phrase.inWayPhrase != null
            )
          ) {
            throw new FilteredOutError("in way phrase within compound");
          }
          if (phrase.every((phrase) => phrase.type === "noun")) {
            return {
              type: "noun",
              noun: compoundNoun(
                conjunction,
                phrase.map((phrase) => phrase.noun),
              ),
            };
          } else if (
            andParticle !== "en" &&
            phrase.every((phrase) => phrase.type === "adjective")
          ) {
            return {
              type: "adjective",
              adjective: compoundAdjective(
                conjunction,
                phrase.map((phrase) => phrase.adjective),
              ),
              inWayPhrase: null,
            };
          } else if (andParticle !== "en") {
            return { type: "verb", verb: compoundVerb(conjunction, phrase) };
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
