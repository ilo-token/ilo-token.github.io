import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import {
  AdjectiveWithInWay,
  extractNegativeFromAdjective,
} from "./adjective.ts";
import { extractNegativeFromMultipleAdverbs, NOT } from "./adverb.ts";
import * as English from "./ast.ts";
import { getNumber } from "./determiner.ts";
import {
  ExhaustedError,
  FilteredError,
  TranslationTodoError,
  UntranslatableError,
} from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
import {
  AdjectivalModifier,
  AdverbialModifier,
  multipleModifiers,
} from "./modifier.ts";
import { extractNegativeFromNoun, fromNounForms, PartialNoun } from "./noun.ts";
import {
  extractNegativeFromPreposition,
  nounAsPreposition,
  preposition,
} from "./preposition.ts";
import { Place } from "./pronoun.ts";
import { PartialSimpleVerb, PartialVerb } from "./verb.ts";
import { word } from "./word.ts";
import { wordUnit } from "./word_unit.ts";

export type PhraseTranslation =
  | Readonly<{ type: "noun"; noun: English.NounPhrase }>
  | (Readonly<{ type: "adjective" }> & AdjectiveWithInWay)
  | Readonly<{ type: "verb"; verb: PartialVerb }>;

function nounPhrase(
  options: Readonly<{
    emphasis: boolean;
    noun: PartialNoun;
    modifier: AdjectivalModifier;
  }>,
) {
  const { emphasis, noun, modifier } = options;
  return IterableResult.from(() => {
    const determiners = [
      ...[...modifier.determiners].reverse(),
      ...noun.determiners,
    ];
    const quantity = getNumber(determiners);
    const adjectives = [
      ...[...modifier.adjectives].reverse(),
      ...noun.adjectives,
    ];
    if (noun.postAdjective != null && modifier.name != null) {
      throw new FilteredError("double name");
    }
    const postAdjective = noun.postAdjective ??
      mapNullable(
        modifier.name,
        (name): English.PostAdjective => ({ adjective: "named", name }),
      );
    const prepositions = nullableAsArray(modifier.ofPhrase)
      .map((object) => nounAsPreposition(object, "of"));
    // TODO: do this on `fixer.ts` instead
    if (prepositions.length > 0 && postAdjective != null) {
      throw new FilteredError("named noun with preposition");
    }
    const headNoun = fromNounForms(noun, quantity)
      .map(({ noun: useWord, quantity }): English.NounPhrase => ({
        type: "simple",
        determiners,
        adjectives,
        noun: word({
          word: useWord,
          reduplicationCount: noun.reduplicationCount,
          emphasis: noun.emphasis,
        }),
        quantity,
        perspective: noun.perspective,
        postCompound: null,
        postAdjective,
        prepositions,
        emphasis: emphasis &&
          modifier.nounPreposition == null,
      }));
    if (modifier.nounPreposition == null) {
      return headNoun;
    } else if (modifier.ofPhrase == null) {
      return headNoun.map((noun): English.NounPhrase => ({
        ...modifier.nounPreposition!.noun as English.NounPhrase & {
          type: "simple";
        },
        prepositions: [nounAsPreposition(
          noun,
          modifier.nounPreposition!.preposition,
        )],
        emphasis,
      }));
    } else {
      // will be filled by ExhaustedError on `defaultPhrase`
      return IterableResult.empty();
    }
  });
}
function adjectivePhrase(
  options: Readonly<{
    emphasis: boolean;
    adjective: English.AdjectivePhrase;
    modifier: AdverbialModifier;
  }>,
): AdjectiveWithInWay {
  const { emphasis, adjective, modifier } = options;
  switch (adjective.type) {
    case "simple": {
      const adverbs = [
        ...[...modifier.adverbs].reverse(),
        ...adjective.adverbs,
      ];
      return {
        adjective: {
          ...adjective,
          adverbs,
          emphasis,
        },
        inWayPhrase: modifier.inWayPhrase,
      };
    }
    case "compound":
      if (modifier.adverbs.length === 0) {
        return {
          adjective: { ...adjective, emphasis: adjective.emphasis || emphasis },
          inWayPhrase: modifier.inWayPhrase,
        };
      } else {
        throw new FilteredError("adverb with compound adjective");
      }
  }
}
function verbPhrase(
  options: Readonly<{
    emphasis: boolean;
    verb: PartialSimpleVerb;
    modifier: AdverbialModifier;
  }>,
): PartialSimpleVerb {
  const { emphasis, verb, modifier } = options;
  const prepositions = [
    ...verb.prepositions,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) => nounAsPreposition(object, "in")),
  ];
  const adverbs = [...modifier.adverbs].reverse();
  const extracted = extractNegativeFromMultipleAdverbs(adverbs);
  if (
    extracted != null && extractNegativeFromMultipleAdverbs(extracted) != null
  ) {
    throw new FilteredError("double negative");
  }
  const negated = extracted != null;
  const useAdverbs = extracted ?? adverbs;
  const { first } = verb;
  switch (first.type) {
    case "modal": {
      const postAdverb = negated ? NOT : null;
      return {
        ...verb,
        first: {
          type: "modal",
          preAdverbs: useAdverbs,
          verb: first.verb,
          postAdverb,
        },
        emphasis: emphasis,
        prepositions,
      };
    }
    case "non-modal":
      return {
        ...verb,
        first: {
          ...first,
          type: "non-modal",
          negated,
          adverbs: useAdverbs,
        },
        emphasis: emphasis,
        prepositions,
      };
  }
}
function defaultPhrase(
  options: Readonly<{
    phrase: TokiPona.Phrase & { type: "simple" };
    place: Place;
    includeGerund: boolean;
    includeVerb: boolean;
  }>,
) {
  const { phrase, includeVerb } = options;
  const emphasis = phrase.emphasis != null;
  return IterableResult.combine(
    wordUnit({ ...options, wordUnit: phrase.headWord }),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        return nounPhrase({ emphasis, noun: headWord, modifier })
          .map((noun): PhraseTranslation => ({ type: "noun", noun }));
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        return IterableResult.single<PhraseTranslation>({
          ...adjectivePhrase({
            emphasis,
            adjective: headWord.adjective,
            modifier,
          }),
          type: "adjective",
        });
      } else if (
        includeVerb && headWord.type === "verb" && modifier.type === "adverbial"
      ) {
        return IterableResult.from(() =>
          IterableResult.single<PhraseTranslation>({
            type: "verb",
            verb: {
              ...verbPhrase({ emphasis, verb: headWord, modifier }),
              type: "simple",
            },
          })
        );
      } else {
        return IterableResult.empty();
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(phrase)));
}
function prepositionAsVerb(
  preposition: English.Preposition,
): PartialSimpleVerb {
  const extracted = extractNegativeFromPreposition(preposition);
  return {
    first: {
      type: "non-modal",
      adverbs: [],
      presentPlural: "are",
      presentSingular: "is",
      past: "were",
      negated: extracted != null,
      reduplicationCount: 1,
      emphasis: false,
    },
    rest: [],
    subjectComplement: null,
    object: null,
    objectComplement: null,
    prepositions: [extracted ?? preposition],
    forObject: false,
    predicateType: null,
    emphasis: false,
  };
}
export function phrase(
  options: Readonly<{
    phrase: TokiPona.Phrase;
    place: Place;
    includeGerund: boolean;
    includeVerb: boolean;
  }>,
): IterableResult<PhraseTranslation> {
  const { phrase, includeVerb } = options;
  switch (phrase.type) {
    case "simple":
      return defaultPhrase({ ...options, phrase });
    case "preposition":
      if (includeVerb) {
        return preposition(phrase)
          .map(prepositionAsVerb)
          .map((verb): PhraseTranslation => ({
            type: "verb",
            verb: { ...verb, type: "simple" },
          }));
      } else {
        return IterableResult.errors([
          new UntranslatableError("preposition", "noun or adjective"),
        ]);
      }
    case "preverb":
      return IterableResult.errors([new TranslationTodoError(phrase.type)]);
  }
}
function compoundNoun(
  conjunction: string,
  phrases: ReadonlyArray<English.NounPhrase>,
): English.NounPhrase {
  const nouns = phrases
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
  return {
    type: "compound",
    conjunction,
    nouns,
  };
}
function compoundAdjective(
  conjunction: string,
  phrases: ReadonlyArray<English.AdjectivePhrase>,
): English.AdjectivePhrase {
  return {
    type: "compound",
    conjunction,
    adjectives: phrases
      .flatMap((adjective) => {
        if (
          adjective.type === "compound" &&
          adjective.conjunction === conjunction
        ) {
          return adjective.adjectives;
        } else {
          return [adjective];
        }
      }),
    emphasis: false,
  };
}
export function phraseAsVerb(
  phrase: PhraseTranslation,
): PartialVerb {
  switch (phrase.type) {
    case "noun":
    case "adjective": {
      let negated: boolean;
      let subjectComplement: English.Complement;
      switch (phrase.type) {
        case "noun": {
          const extract = extractNegativeFromNoun(phrase.noun);
          negated = extract != null;
          subjectComplement = {
            type: "noun",
            noun: extract ?? phrase.noun,
          };
          break;
        }
        case "adjective": {
          const extract = extractNegativeFromAdjective(phrase.adjective);
          negated = extract != null;
          subjectComplement = {
            type: "adjective",
            adjective: extract ?? phrase.adjective,
          };
          break;
        }
      }
      return {
        type: "simple",
        first: {
          type: "non-modal",
          adverbs: [],
          presentPlural: "are",
          presentSingular: "is",
          past: "were",
          negated,
          emphasis: false,
          reduplicationCount: 1,
        },
        rest: [],
        subjectComplement,
        object: null,
        objectComplement: null,
        prepositions: [],
        forObject: false,
        predicateType: null,
        emphasis: false,
      };
    }
    case "verb":
      return phrase.verb;
  }
}
export function multiplePhrases(
  options: Readonly<{
    phrases: TokiPona.MultiplePhrases;
    place: Place;
    includeGerund: boolean;
    andParticle: null | string;
    includeVerb: boolean;
  }>,
): IterableResult<PhraseTranslation> {
  const { phrases, andParticle, includeVerb } = options;
  switch (phrases.type) {
    case "simple":
      return phrase({ ...options, phrase: phrases.phrase });
    case "and":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return IterableResult.combine(
        ...phrases.phrases
          .map((phrases) => multiplePhrases({ ...options, phrases })),
      )
        .filterMap((phrase): null | PhraseTranslation => {
          if (
            phrase.some((phrase) =>
              phrase.type === "adjective" && phrase.inWayPhrase != null
            )
          ) {
            throw new FilteredError(
              "in [adjective] way phrase within compound",
            );
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
                verbs: phrase.map(phraseAsVerb),
                object: null,
                objectComplement: null,
                prepositions: [],
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
  options: Readonly<{
    phrases: TokiPona.MultiplePhrases;
    place: Place;
    includeGerund: boolean;
    andParticle: string;
  }>,
): IterableResult<English.NounPhrase> {
  return multiplePhrases({ ...options, includeVerb: false })
    .filterMap((phrase) => phrase.type === "noun" ? phrase.noun : null);
}
