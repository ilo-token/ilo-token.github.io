import { IterableResult } from "../compound.ts";
import { nullableAsArray } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "../resolver_and_composer/ast.ts";
import { CONJUNCTION } from "../translator/conjuction.ts";
import { FilteredError, UntranslatableError } from "../translator/error.ts";
import {
  AdjectiveWithInWay,
  extractNegativeFromAdjective,
} from "./adjective.ts";
import { extractNegativeFromNoun } from "./noun.ts";
import {
  multiplePhrases,
  phrase,
  phraseAsVerb,
  PhraseTranslation,
} from "./phrase.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
import { forObject, PartialVerb } from "./verb.ts";

function verbObject(
  verb: PartialVerb,
  object: English.NounPhrase,
): PartialVerb {
  const useForObject = forObject(verb);
  if (useForObject === false) {
    throw new FilteredError("intransitive verb with object");
  } else {
    const [useObject, prepositions] = useForObject === true
      ? [object, []]
      : [verb.object, [nounAsPreposition(object, useForObject)]];
    return { ...verb, object: useObject, prepositions };
  }
}
function applyToAndTurnInto(
  predicate: English.NounPhrase,
  object: English.NounPhrase,
) {
  return IterableResult.fromArray([
    ...nullableAsArray(extractNegativeFromNoun(predicate))
      .map((predicate) => [true, predicate] as const),
    [false, predicate] as const,
  ])
    .flatMap(([negated, predicate]) =>
      IterableResult.fromArray<PartialVerb>([
        {
          type: "simple",
          first: {
            type: "non-modal",
            adverbs: [],
            presentPlural: "apply",
            presentSingular: "applies",
            past: "applied",
            negated,
            reduplicationCount: 1,
            emphasis: false,
          },
          rest: [],
          subjectComplement: null,
          object: predicate,
          objectComplement: null,
          prepositions: [nounAsPreposition(object, "to")],
          forObject: false,
          predicateType: null,
          emphasis: false,
        },
        {
          type: "simple",
          first: {
            type: "non-modal",
            adverbs: [],
            presentPlural: "turn",
            presentSingular: "turns",
            past: "turned",
            negated,
            reduplicationCount: 1,
            emphasis: false,
          },
          rest: [],
          subjectComplement: null,
          object,
          objectComplement: null,
          prepositions: [nounAsPreposition(predicate, "into")],
          forObject: false,
          predicateType: null,
          emphasis: false,
        },
      ])
    );
}
function make(predicate: AdjectiveWithInWay, object: English.NounPhrase) {
  return IterableResult.fromArray([
    ...nullableAsArray(extractNegativeFromAdjective(predicate.adjective))
      .map((adjective) => [true, adjective] as const),
    [false, predicate.adjective] as const,
  ])
    .map(([negated, adjective]): PartialVerb => ({
      type: "simple",
      first: {
        type: "non-modal",
        adverbs: [],
        presentPlural: "make",
        presentSingular: "makes",
        past: "made",
        negated,
        reduplicationCount: 1,
        emphasis: false,
      },
      rest: [],
      subjectComplement: null,
      object,
      objectComplement: {
        type: "adjective",
        adjective,
      },
      prepositions: nullableAsArray(predicate.inWayPhrase)
        .map((phrase) => nounAsPreposition(phrase, "in")),
      forObject: false,
      predicateType: null,
      emphasis: false,
    }));
}
function predicateVerb(
  predicate: PhraseTranslation,
  object: English.NounPhrase,
) {
  switch (predicate.type) {
    case "noun":
      return applyToAndTurnInto(predicate.noun, object);
    case "adjective":
      return make(predicate, object);
    case "verb":
      return IterableResult.handleThrows(() =>
        IterableResult.single(verbObject(predicate.verb, object))
      );
  }
}
function associatedPredicate(
  predicate: PhraseTranslation,
  object: null | PhraseTranslation,
  prepositions: ReadonlyArray<English.Preposition>,
) {
  let verbObject: IterableResult<PartialVerb>;
  if (object == null) {
    verbObject = IterableResult.single(phraseAsVerb(predicate));
  } else if (object.type === "noun") {
    verbObject = predicateVerb(predicate, object.noun);
  } else {
    return IterableResult.errors([
      new UntranslatableError(object.type, "object"),
    ]);
  }
  return verbObject.map((verbObject): PartialVerb => ({
    ...verbObject,
    prepositions: [...verbObject.prepositions, ...prepositions],
  }));
}
export function predicate(
  tokiPonaPredicate: TokiPona.Predicate,
  andParticle: string,
): IterableResult<PartialVerb> {
  switch (tokiPonaPredicate.type) {
    case "simple":
      return phrase({
        phrase: tokiPonaPredicate.predicate,
        place: "object",
        includeGerund: false,
      })
        .map(phraseAsVerb);
    case "associated": {
      const predicatePhrase = multiplePhrases({
        phrases: tokiPonaPredicate.predicates,
        place: "object",
        includeGerund: false,
        andParticle,
      });
      const object = IterableResult.single(tokiPonaPredicate.objects)
        .flatMap((object) => {
          if (object != null) {
            return multiplePhrases({
              phrases: object,
              place: "object",
              includeGerund: true,
              andParticle: "e",
            });
          } else {
            return IterableResult.single(null);
          }
        });
      const prepositionPhrase = IterableResult.combine(
        ...tokiPonaPredicate.prepositions.map(preposition),
      );
      return IterableResult.combine(predicatePhrase, object, prepositionPhrase)
        .flatMap(([predicate, object, preposition]) =>
          associatedPredicate(predicate, object, preposition)
        );
    }
    case "and":
    case "anu":
      return IterableResult.combine(
        ...tokiPonaPredicate.predicates
          .map((predicates) => predicate(predicates, andParticle)),
      )
        .map((predicates): PartialVerb => ({
          type: "compound",
          conjunction: CONJUNCTION[tokiPonaPredicate.type],
          verbs: predicates,
          object: null,
          objectComplement: null,
          prepositions: [],
        }));
  }
}
