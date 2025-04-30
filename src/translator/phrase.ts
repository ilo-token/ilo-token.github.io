import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import {
  AdjectiveWithInWay,
  extractNegativeFromAdjective,
} from "./adjective.ts";
import { extractNegativeFromAdverbs, NOT } from "./adverb.ts";
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
import { PartialCompoundVerb, PartialVerb } from "./verb.ts";
import { word } from "./word.ts";
import { wordUnit } from "./word_unit.ts";

export type PhraseTranslation =
  | Readonly<{ type: "noun"; noun: English.NounPhrase }>
  | (Readonly<{ type: "adjective" }> & AdjectiveWithInWay)
  | Readonly<{ type: "verb"; verb: PartialCompoundVerb }>;

function nounPhrase(
  options: Readonly<{
    emphasis: boolean;
    partialNoun: PartialNoun;
    modifier: AdjectivalModifier;
  }>,
) {
  const { emphasis, partialNoun, modifier } = options;
  return IterableResult.from<English.NounPhrase>(() => {
    const determiner = [
      ...[...modifier.determiner].reverse(),
      ...partialNoun.determiner,
    ];
    const quantity = getNumber(determiner);
    const adjective = [
      ...[...modifier.adjective].reverse(),
      ...partialNoun.adjective,
    ];
    if (partialNoun.postAdjective != null && modifier.name != null) {
      throw new FilteredError("double name");
    }
    const postAdjective = partialNoun.postAdjective ??
      mapNullable(modifier.name, (name) => ({ adjective: "named", name }));
    const preposition = [
      ...nullableAsArray(modifier.inPositionPhrase)
        .map((object) => nounAsPreposition(object, "in")),
      ...nullableAsArray(modifier.ofPhrase)
        .map((object) => nounAsPreposition(object, "of")),
    ];
    if (preposition.length > 1) {
      throw new FilteredError("multiple preposition within noun phrase");
    }
    if (preposition.length > 0 && postAdjective != null) {
      throw new FilteredError("named noun with preposition");
    }
    const headNoun = fromNounForms(partialNoun, quantity)
      .map(({ noun, quantity }) => ({
        type: "simple",
        determiner,
        adjective,
        noun: word({
          word: noun,
          reduplicationCount: partialNoun.reduplicationCount,
          emphasis: partialNoun.emphasis,
        }),
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
) {
  const { emphasis, adjective, modifier } = options;
  switch (adjective.type) {
    case "simple": {
      const adverb = [
        ...[...modifier.adverb].reverse(),
        ...adjective.adverb,
      ];
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
    verb: PartialVerb;
    modifier: AdverbialModifier;
  }>,
) {
  const { emphasis, verb, modifier } = options;
  const preposition = [
    ...verb.preposition,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) => nounAsPreposition(object, "in")),
  ];
  const adverb = [...modifier.adverb].reverse();
  const extracted = extractNegativeFromAdverbs(adverb);
  if (extracted != null && extractNegativeFromAdverbs(extracted) != null) {
    throw new FilteredError("double negative");
  }
  const negated = extracted != null;
  const useAdverb = extracted ?? adverb;
  if (verb.first != null) {
    return {
      ...verb,
      first: { ...verb.first, negated, adverb: useAdverb },
      emphasis: emphasis,
      preposition,
    };
  } else if (verb.modal != null) {
    const postAdverb = negated ? NOT : null;
    return {
      ...verb,
      modal: {
        preAdverb: useAdverb,
        verb: verb.modal.verb,
        postAdverb,
      },
      emphasis: emphasis,
      preposition,
    };
  } else {
    // This should be unreachable
    throw new FilteredError(
      "verb phrase without modal verb nor conjugated verb",
    );
  }
}
function defaultPhrase(
  options: Readonly<{
    phrase: TokiPona.Phrase & { type: "default" };
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
    .flatMap<PhraseTranslation>(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        return nounPhrase({ emphasis, partialNoun: headWord, modifier })
          .map((noun) => ({ type: "noun", noun }));
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        return IterableResult.single({
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
          IterableResult.single({
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
function prepositionAsVerb(preposition: English.Preposition) {
  const extracted = extractNegativeFromPreposition(preposition);
  return {
    modal: null,
    first: {
      adverb: [],
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
    preposition: [extracted ?? preposition],
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
    case "default":
      return defaultPhrase({ ...options, phrase });
    case "preposition":
      if (includeVerb) {
        return preposition(phrase)
          .map(prepositionAsVerb)
          .map((verb) => ({
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
  conjunction: "and" | "or",
  phrase: ReadonlyArray<English.NounPhrase>,
) {
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
  } as const;
}
function compoundAdjective(
  conjunction: "and" | "or",
  phrase: ReadonlyArray<English.AdjectivePhrase>,
) {
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
  } as const;
}
export function phraseAsVerb(
  phrase: PhraseTranslation,
): PartialCompoundVerb {
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
        modal: null,
        first: {
          adverb: [],
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
        preposition: [],
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
    case "single":
      return phrase({ ...options, phrase: phrases.phrase });
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return IterableResult.combine(
        ...phrases.phrases
          .map((phrases) => multiplePhrases({ ...options, phrases })),
      )
        .filterMap((phrase) => {
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
