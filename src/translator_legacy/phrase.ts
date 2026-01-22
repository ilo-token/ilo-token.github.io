import { IterableResult } from "../compound.ts";
import { mapNullable, nullableAsArray } from "../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { CONJUNCTION } from "../translator/conjuction.ts";
import { ExhaustedError, FilteredError } from "../translator/error.ts";
import { word } from "../translator/word.ts";
import {
  AdjectiveWithInWay,
  combineAdjective,
  extractNegativeFromAdjective,
} from "./adjective.ts";
import { extractNegativeFromMultipleAdverbs, NOT } from "./adverb.ts";
import * as English from "./ast.ts";
import { getNumber } from "./determiner.ts";
import {
  AdjectivalModifier,
  AdverbialModifier,
  multipleModifiers,
} from "./modifier.ts";
import {
  combineNoun,
  extractNegativeFromNoun,
  fromNounForms,
  PartialNoun,
} from "./noun.ts";
import {
  extractNegativeFromPreposition,
  nounAsPreposition,
  preposition,
} from "./preposition.ts";
import { Place } from "./pronoun.ts";
import { PartialSimpleVerb, PartialVerb } from "./verb.ts";
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
  return IterableResult.handleThrows(() => {
    const determiners = [
      ...modifier.determiners.toReversed(),
      ...noun.determiners,
    ];
    const quantity = getNumber(determiners);
    const adjectives = [
      ...modifier.adjectives.toReversed(),
      ...noun.adjectives,
    ];
    if (noun.adjectiveName != null && modifier.name != null) {
      throw new FilteredError("double name");
    }
    const adjectiveName = noun.adjectiveName ??
      mapNullable(
        modifier.name,
        (name): English.AdjectiveName => ({ adjective: "named", name }),
      );
    const prepositions = modifier.ofPhrase
      .map((object) => nounAsPreposition(object, "of"));
    const { nounPreposition } = modifier;
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
        adjectiveName,
        prepositions,
        emphasis: emphasis &&
          nounPreposition == null,
      }));
    if (nounPreposition == null) {
      return headNoun;
    } else if (modifier.ofPhrase.length === 0) {
      const { noun: nounOf, preposition } = nounPreposition;
      switch (nounOf.type) {
        case "simple":
          return headNoun.map((noun): English.NounPhrase => ({
            ...nounOf,
            prepositions: [nounAsPreposition(noun, preposition)],
            emphasis,
          }));
        case "compound":
          throw new FilteredError("compound nouns followed by preposition");
      }
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
        ...modifier.adverbs.toReversed(),
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
  const adverbs = modifier.adverbs.toReversed();
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
  }>,
) {
  const { phrase } = options;
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
        headWord.type === "verb" && modifier.type === "adverbial"
      ) {
        return IterableResult.handleThrows(() =>
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
function preverb(
  preverb: TokiPona.Phrase & { type: "preverb" },
): IterableResult<PartialSimpleVerb> {
  const emphasis = preverb.emphasis != null;
  const verb = IterableResult.combine(
    wordUnit({
      wordUnit: preverb.preverb,
      place: "object",
      includeGerund: false,
    }),
    multipleModifiers(preverb.modifiers),
  )
    .filterMap(([verb, modifier]) =>
      verb.type === "verb" && modifier.type === "adverbial"
        ? verbPhrase({ verb, modifier, emphasis: false })
        : null
    );
  return IterableResult.combine(
    verb,
    translatePhrase({
      phrase: preverb.phrase,
      place: "object",
      includeGerund: false,
    }),
  )
    .filterMap(([verb, predicate]): null | PartialSimpleVerb => {
      if (
        verb.predicateType === "noun adjective" &&
        (predicate.type === "noun" || predicate.type === "adjective")
      ) {
        let subjectComplement: English.Complement;
        switch (predicate.type) {
          case "noun":
            subjectComplement = { type: "noun", noun: predicate.noun };
            break;
          case "adjective":
            subjectComplement = {
              type: "adjective",
              adjective: predicate.adjective,
            };
            break;
        }
        return { ...verb, subjectComplement, emphasis };
      } else if (
        verb.predicateType === "verb" && predicate.type === "verb" &&
        predicate.verb.type === "simple"
      ) {
        const first = predicate.verb.first;
        let predicateVerb: English.Verb;
        switch (first.type) {
          case "modal":
            return null;
          case "non-modal":
            predicateVerb = {
              preAdverbs: first.adverbs,
              verb: word({
                ...first,
                word: first.presentPlural,
                emphasis: false,
              }),
              postAdverb: null,
            };
        }
        return {
          ...predicate.verb,
          first: verb.first,
          rest: [...verb.rest, predicateVerb, ...predicate.verb.rest],
          emphasis,
        };
      } else {
        return null;
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(preverb)));
}
const translatePhrase = phrase;
export function phrase(
  options: Readonly<{
    phrase: TokiPona.Phrase;
    place: Place;
    includeGerund: boolean;
  }>,
): IterableResult<PhraseTranslation> {
  const { phrase } = options;
  switch (phrase.type) {
    case "simple":
      return defaultPhrase({ ...options, phrase });
    case "preposition":
      return preposition(phrase)
        .map(prepositionAsVerb)
        .map((verb): PhraseTranslation => ({
          type: "verb",
          verb: { ...verb, type: "simple" },
        }));
    case "preverb":
      return preverb(phrase)
        .map((verb): PhraseTranslation => ({
          type: "verb",
          verb: { ...verb, type: "simple" },
        }));
  }
}
export function phraseAsVerb(
  phrase: PhraseTranslation,
): PartialVerb {
  switch (phrase.type) {
    case "noun":
    case "adjective": {
      let negated: boolean;
      let subjectComplement: English.Complement;
      let inWayPhrase: null | English.NounPhrase;
      switch (phrase.type) {
        case "noun": {
          inWayPhrase = null;
          const extract = extractNegativeFromNoun(phrase.noun);
          negated = extract != null;
          subjectComplement = {
            type: "noun",
            noun: extract ?? phrase.noun,
          };
          break;
        }
        case "adjective": {
          inWayPhrase = phrase.inWayPhrase;
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
        prepositions: nullableAsArray(inWayPhrase)
          .map((noun) => nounAsPreposition(noun, "in")),
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
    andParticle: string;
  }>,
): IterableResult<PhraseTranslation> {
  const { phrases, andParticle } = options;
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
              noun: combineNoun(
                conjunction,
                phrase.map(({ noun }) => noun),
              ),
            };
          } else if (phrase.every((phrase) => phrase.type === "adjective")) {
            if (andParticle === "en" && conjunction === "and") {
              return null;
            } else {
              return {
                type: "adjective",
                adjective: combineAdjective(
                  conjunction,
                  phrase.map(({ adjective }) => adjective),
                ),
                inWayPhrase: null,
              };
            }
          } else {
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
          }
        })
        .addErrorWhenNone(() =>
          new ExhaustedError(Composer.multiplePhrases(phrases))
        );
    }
  }
}
