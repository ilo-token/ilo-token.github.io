import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { ArrayResult } from "../array_result.ts";
import * as TokiPona from "../parser/ast.ts";
import * as Composer from "../parser/composer.ts";
import { AdjectiveWithInWay, fixAdjective } from "./adjective.ts";
import { fixAdverb } from "./adverb.ts";
import * as English from "./ast.ts";
import { fixDeterminer, getNumber } from "./determiner.ts";
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
import { fromNounForms, PartialNoun } from "./noun.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
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
  return ArrayResult.from<English.NounPhrase>(() => {
    const determiner = fixDeterminer([
      ...[...modifier.determiner].reverse(),
      ...partialNoun.determiner,
    ]);
    const quantity = getNumber(determiner);
    const adjective = fixAdjective([
      ...[...modifier.adjective].reverse(),
      ...partialNoun.adjective,
    ]);
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
        type: "simple" as const,
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
      return ArrayResult.empty();
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
  options: Readonly<{
    phrase: TokiPona.Phrase & { type: "default" };
    place: Place;
    includeGerund: boolean;
    includeVerb: boolean;
  }>,
) {
  const { phrase, includeVerb } = options;
  const emphasis = phrase.emphasis != null;
  return ArrayResult.combine(
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
        return new ArrayResult([{
          ...adjectivePhrase({
            emphasis,
            adjective: headWord.adjective,
            modifier,
          }),
          type: "adjective",
        }]);
      } else if (
        includeVerb && headWord.type === "verb" && modifier.type === "adverbial"
      ) {
        return new ArrayResult([{
          type: "verb",
          verb: {
            ...verbPhrase({ emphasis, verb: headWord, modifier }),
            type: "simple",
          },
        }]);
      } else {
        return ArrayResult.empty();
      }
    })
    .addErrorWhenNone(() => new ExhaustedError(Composer.phrase(phrase)));
}
function prepositionAsVerb(preposition: English.Preposition) {
  return {
    modal: null,
    adverb: [],
    first: {
      presentPlural: "are",
      presentSingular: "is",
      past: "were",
    },
    reduplicationCount: 1,
    wordEmphasis: false,
    rest: [],
    subjectComplement: null,
    object: null,
    objectComplement: null,
    preposition: [preposition],
    forObject: false,
    predicateType: null,
    phraseEmphasis: false,
  };
}
export function phrase(
  options: Readonly<{
    phrase: TokiPona.Phrase;
    place: Place;
    includeGerund: boolean;
    includeVerb: boolean;
  }>,
): ArrayResult<PhraseTranslation> {
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
        return ArrayResult.errors([
          new UntranslatableError("preposition", "noun or adjective"),
        ]);
      }
    case "preverb":
      return ArrayResult.errors([new TranslationTodoError(phrase.type)]);
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
        modal: null,
        adverb: [],
        first: {
          presentPlural: "are",
          presentSingular: "is",
          past: "were",
        },
        wordEmphasis: false,
        reduplicationCount: 1,
        rest: [],
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
  options: Readonly<{
    phrases: TokiPona.MultiplePhrases;
    place: Place;
    includeGerund: boolean;
    andParticle: null | string;
    includeVerb: boolean;
  }>,
): ArrayResult<PhraseTranslation> {
  const { phrases, andParticle, includeVerb } = options;
  switch (phrases.type) {
    case "single":
      return phrase({ ...options, phrase: phrases.phrase });
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return ArrayResult.combine(
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
): ArrayResult<English.NounPhrase> {
  return multiplePhrases({ ...options, includeVerb: false })
    .filterMap((phrase) => phrase.type === "noun" ? phrase.noun : null);
}
