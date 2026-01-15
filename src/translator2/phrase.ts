import * as English from "./ast.ts";
import { addWay, AdjectiveWithInWay } from "./adjective.ts";
import { adjectivalIsNone, AdjectivalModifier } from "./modifier.ts";
import { ExhaustedError, FilteredError } from "./error.ts";
import { mapNullable, nullableAsArray } from "../misc/misc.ts";
import { nounAsPreposition } from "./preposition.ts";
import { AdverbialModifier } from "./modifier.ts";
import * as TokiPona from "../parser/ast.ts";
import { IterableResult } from "../compound.ts";
import { wordUnit } from "./word_unit.ts";
import { multipleModifiers } from "./modifier.ts";
import * as Composer from "../parser/composer.ts";
import { CONJUNCTION } from "./misc.ts";
import { preposition } from "./preposition.ts";
import { equal } from "@std/assert/equal";

export type PhraseTranslation =
  | Readonly<{
    type: "noun";
    noun: English.NounPhrase;
    adverbialModifier: AdverbialModifier;
  }>
  | (Readonly<{ type: "adjective" }> & AdjectiveWithInWay)
  | Readonly<{ type: "verb"; verb: English.VerbPhrase }>;

function nounPhrase(
  options: Readonly<{
    emphasis: boolean;
    noun: English.SimpleNounPhrase;
    modifier: AdjectivalModifier;
  }>,
): null | English.SimpleNounPhrase {
  const { emphasis, noun, modifier } = options;
  const determiners = [
    ...modifier.determiners.toReversed(),
    ...noun.determiners,
  ];
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
  const headNoun: English.SimpleNounPhrase = {
    ...noun,
    determiners,
    adjectives,
    perspective: noun.perspective,
    postCompound: null,
    adjectiveName,
    prepositions,
    phraseEmphasis: emphasis &&
      nounPreposition == null,
  };
  if (nounPreposition == null) {
    return headNoun;
  } else if (modifier.ofPhrase.length === 0) {
    const { noun: nounOf, preposition } = nounPreposition;
    switch (nounOf.type) {
      case "simple":
        return {
          ...nounOf,
          prepositions: [
            nounAsPreposition({ ...headNoun, type: "simple" }, preposition),
          ],
          phraseEmphasis: emphasis,
        };
      case "compound":
        throw new FilteredError("compound nouns followed by preposition");
    }
  } else {
    return null;
  }
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
          adjective: { ...adjective },
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
    verb: English.SimpleVerbPhrase;
    modifier: AdverbialModifier;
  }>,
): English.SimpleVerbPhrase {
  const { emphasis, verb, modifier } = options;
  const prepositions = [
    ...verb.prepositions,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) =>
        nounAsPreposition({ ...addWay(object), type: "simple" }, "in")
      ),
  ];
  const adverbs = modifier.adverbs.toReversed();
  return {
    ...verb,
    verb: [
      {
        preAdverbs: adverbs,
        verb: verb.verb[0].verb,
        postAdverb: null,
      },
      ...verb.verb.slice(1),
    ],
    prepositions,
    emphasis,
  };
}
function defaultPhrase(
  options: Readonly<{
    phrase: TokiPona.Phrase & { type: "simple" };
    includeGerund: boolean;
  }>,
) {
  const { phrase } = options;
  const emphasis = phrase.emphasis != null;
  return IterableResult.combine(
    wordUnit(phrase.headWord),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap(([headWord, modifier]) => {
      if (headWord.type === "noun") {
        return IterableResult.fromArray(
          nullableAsArray(
            nounPhrase({
              emphasis,
              noun: headWord,
              modifier: modifier.adjectival,
            }),
          ),
        )
          .map((noun): PhraseTranslation => ({
            type: "noun",
            noun: { ...noun, type: "simple" },
            adverbialModifier: modifier.adverbial,
          }));
      } else if (
        headWord.type === "adjective" && adjectivalIsNone(modifier.adjectival)
      ) {
        return IterableResult.single<PhraseTranslation>({
          ...adjectivePhrase({
            emphasis,
            adjective: headWord.adjective,
            modifier: modifier.adverbial,
          }),
          type: "adjective",
        });
      } else if (
        headWord.type === "verb" && adjectivalIsNone(modifier.adjectival)
      ) {
        return IterableResult.from(() =>
          IterableResult.single<PhraseTranslation>({
            type: "verb",
            verb: {
              ...verbPhrase({
                emphasis,
                verb: headWord,
                modifier: modifier.adverbial,
              }),
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
): English.SimpleVerbPhrase {
  return {
    verb: [{
      preAdverbs: [],
      verb: {
        type: "non-modal",
        presentPlural: "are",
        presentSingular: "is",
        past: "were",
        reduplicationCount: 1,
        emphasis: false,
      },
      postAdverb: null,
    }],
    subjectComplement: null,
    contentClause: null,
    object: null,
    objectComplement: null,
    prepositions: [preposition],
    forObject: false,
    predicateType: null,
    emphasis: false,
    hideVerb: false,
  };
}
function preverb(
  preverb: TokiPona.Phrase & { type: "preverb" },
): IterableResult<English.SimpleVerbPhrase> {
  const emphasis = preverb.emphasis != null;
  const verb = IterableResult.combine(
    wordUnit(preverb.preverb),
    multipleModifiers(preverb.modifiers),
  )
    .filterMap(([verb, modifier]) =>
      verb.type === "verb" && adjectivalIsNone(modifier.adjectival)
        ? verbPhrase({ verb, modifier: modifier.adverbial, emphasis: false })
        : null
    );
  return IterableResult.combine(
    verb,
    translatePhrase({
      phrase: preverb.phrase,
      includeGerund: false,
    }),
  )
    .filterMap(([verb, predicate]): null | English.SimpleVerbPhrase => {
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
        const first = predicate.verb.verb[0];
        // TODO: filter out modal verb when found in the middle
        const predicateVerb: English.AdverbVerb = {
          preAdverbs: first.preAdverbs,
          verb: first.verb,
          postAdverb: null,
        };
        return {
          ...predicate.verb,
          verb: [
            ...verb.verb,
            predicateVerb,
            ...predicate.verb.verb.slice(1),
          ],
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
): English.VerbPhrase {
  // TODO: on grammar fixer, extract noun and adjective negative modifier and put it on the verb
  switch (phrase.type) {
    case "noun":
    case "adjective": {
      let subjectComplement: English.Complement;
      let inWayPhrase: null | English.AdjectivePhrase;
      switch (phrase.type) {
        case "noun": {
          inWayPhrase = null;
          subjectComplement = {
            type: "noun",
            noun: phrase.noun,
          };
          break;
        }
        case "adjective": {
          inWayPhrase = phrase.inWayPhrase;
          subjectComplement = {
            type: "adjective",
            adjective: phrase.adjective,
          };
          break;
        }
      }
      return {
        type: "simple",
        verb: [
          {
            verb: {
              type: "non-modal",
              presentPlural: "are",
              presentSingular: "is",
              past: "were",
              emphasis: false,
              reduplicationCount: 1,
            },
            preAdverbs: [],
            postAdverb: null,
          },
        ],
        subjectComplement,
        contentClause: null,
        object: null,
        objectComplement: null,
        prepositions: nullableAsArray(inWayPhrase)
          .map((adjective) =>
            nounAsPreposition({ ...addWay(adjective), type: "simple" }, "in")
          ),
        forObject: false,
        predicateType: null,
        emphasis: false,
        hideVerb: false,
      };
    }
    case "verb":
      return phrase.verb;
  }
}

export function multiplePhrases(
  options: Readonly<{
    phrases: TokiPona.MultiplePhrases;
    includeGerund: boolean;
    andParticle: null | string;
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
            const firstAdverbial = phrase[0].adverbialModifier;
            const allEqual = phrase.slice(1).every((phrase) =>
              equal(phrase.adverbialModifier, firstAdverbial)
            );
            if (allEqual) {
              return {
                type: "noun",
                // TODO: flatten compound nouns on the grammar fixer
                noun: {
                  type: "compound",
                  conjunction,
                  nouns: phrase.map(({ noun }) => noun),
                },
                adverbialModifier: firstAdverbial,
              };
            } else {
              return null;
            }
          } else if (phrase.every((phrase) => phrase.type === "adjective")) {
            if (andParticle === "en" && conjunction === "and") {
              return null;
            } else {
              return {
                type: "adjective",
                // TODO: flatten compound adjective on the grammar fixer
                adjective: {
                  type: "compound",
                  conjunction,
                  adjectives: phrase.map(({ adjective }) => adjective),
                },
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
          new ExhaustedError(Composer.multiplePhrases(phrases, andParticle))
        );
    }
  }
}
