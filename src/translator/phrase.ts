import { ArrayResult } from "../array_result.ts";
import { nullableAsArray } from "../misc.ts";
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
import { fromNounForms, PartialNoun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { Place } from "./pronoun.ts";
import { PartialCompoundVerb, PartialVerb } from "./verb.ts";
import { wordUnit } from "./word_unit.ts";
import { word } from "./word.ts";

export type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | ({ type: "adjective" } & AdjectiveWithInWay)
  | { type: "verb"; verb: PartialCompoundVerb };
function nounPhrase(
  emphasis: boolean,
  partialNoun: PartialNoun,
  modifier: AdjectivalModifier,
): ArrayResult<English.NounPhrase> {
  return ArrayResult.from(() => {
    const determiner = fixDeterminer([
      ...[...modifier.determiner].reverse(),
      ...partialNoun.determiner,
    ]);
    const quantity = findNumber(determiner);
    const adjective = fixAdjective([
      ...[...modifier.adjective].reverse(),
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
        .map((object) => nounAsPreposition(object, "in")),
      ...nullableAsArray(modifier.ofPhrase)
        .map((object) => nounAsPreposition(object, "of")),
    ];
    if (preposition.length > 1) {
      throw new FilteredOutError("multiple preposition within noun phrase");
    }
    if (preposition.length > 0 && postAdjective != null) {
      throw new FilteredOutError("named noun with preposition");
    }
    const headNoun = fromNounForms(partialNoun, quantity)
      .map(({ noun, quantity }) => ({
        type: "simple" as const,
        determiner,
        adjective,
        noun: word(noun, partialNoun.reduplicationCount, partialNoun.emphasis),
        quantity,
        perspective: partialNoun.perspective,
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
      return headNoun.map((noun) => ({
        ...modifier.nounPreposition!.noun as English.NounPhrase & {
          type: "simple";
        },
        preposition: [nounAsPreposition(
          noun,
          modifier.nounPreposition!.preposition,
        )],
        emphasis,
      }));
    } else {
      // will be filled by ExhaustedError on `defaultPhrase`
      return new ArrayResult();
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
        ...[...modifier.adverb].reverse(),
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
    ...[...modifier.adverb].reverse(),
    ...verb.adverb,
  ]);
  const preposition = [
    ...verb.preposition,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) => nounAsPreposition(object, "in")),
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
  place: Place,
  includeGerund: boolean,
  includeVerb: boolean,
): ArrayResult<PhraseTranslation> {
  const emphasis = phrase.emphasis != null;
  return ArrayResult.combine(
    wordUnit(phrase.headWord, place, includeGerund),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap<PhraseTranslation>(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        return nounPhrase(emphasis, headWord, modifier)
          .map((noun) => ({ type: "noun", noun }));
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        return new ArrayResult([{
          ...adjectivePhrase(emphasis, headWord.adjective, modifier),
          type: "adjective",
        }]);
      } else if (
        includeVerb && headWord.type === "verb" && modifier.type === "adverbial"
      ) {
        return new ArrayResult<PhraseTranslation>([{
          type: "verb",
          verb: { ...verbPhrase(emphasis, headWord, modifier), type: "simple" },
        }]);
      } else {
        return new ArrayResult();
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(phrase)));
}
export function phrase(
  phrase: TokiPona.Phrase,
  place: Place,
  includeGerund: boolean,
  includeVerb: boolean,
): ArrayResult<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return defaultPhrase(phrase, place, includeGerund, includeVerb);
    case "preverb":
    case "preposition":
    case "quotation":
      return new ArrayResult(new TranslationTodoError(phrase.type));
  }
}
function compoundNoun(
  conjunction: "and" | "or",
  phrase: ReadonlyArray<English.NounPhrase>,
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
  phrase: ReadonlyArray<English.AdjectivePhrase>,
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
export function phraseAsVerb(
  phrase: PhraseTranslation,
): PartialCompoundVerb {
  switch (phrase.type) {
    case "noun":
    case "adjective": {
      let subjectComplement: English.Complement;
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
        presentPlural: "are",
        presentSingular: "is",
        past: "were",
        wordEmphasis: false,
        reduplicationCount: 1,
        subjectComplement,
        object: null,
        objectComplement: null,
        preposition: [],
        forObject: false,
        predicateType: null,
        phraseEmphasis: false,
      };
    }
    case "verb":
      return phrase.verb;
  }
}
export function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: Place,
  includeGerund: boolean,
  andParticle: string,
  includeVerb: boolean,
): ArrayResult<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place, includeGerund, includeVerb);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return ArrayResult.combine(
        ...phrases.phrases
          .map((phrases) =>
            multiplePhrases(
              phrases,
              place,
              includeGerund,
              andParticle,
              includeVerb,
            )
          ),
      )
        .filterMap<null | PhraseTranslation>((phrase) => {
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
          } else if (phrase.every((phrase) => phrase.type === "adjective")) {
            if (andParticle === "en" && conjunction === "and") {
              return null;
            } else {
              return {
                type: "adjective",
                adjective: compoundAdjective(
                  conjunction,
                  phrase.map((phrase) => phrase.adjective),
                ),
                inWayPhrase: null,
              };
            }
          } else if (includeVerb) {
            return {
              type: "verb",
              verb: {
                type: "compound",
                conjunction,
                verb: phrase.map(phraseAsVerb),
                object: null,
                objectComplement: null,
                preposition: [],
              },
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
export function multiplePhrasesAsNoun(
  phrases: TokiPona.MultiplePhrases,
  place: Place,
  includeGerund: boolean,
  andParticle: string,
): ArrayResult<English.NounPhrase> {
  return multiplePhrases(phrases, place, includeGerund, andParticle, false)
    .filterMap((phrase) => {
      if (phrase.type === "noun") {
        return phrase.noun;
      } else {
        return null;
      }
    });
}
