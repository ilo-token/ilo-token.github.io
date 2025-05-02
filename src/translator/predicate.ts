import { nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import {
  AdjectiveWithInWay,
  extractNegativeFromAdjective,
} from "./adjective.ts";
import * as English from "./ast.ts";
import { FilteredError, UntranslatableError } from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
import { extractNegativeFromNoun } from "./noun.ts";
import {
  multiplePhrases,
  phrase,
  phraseAsVerb,
  PhraseTranslation,
} from "./phrase.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
import { forObject, PartialCompoundVerb } from "./verb.ts";

function verbObject(
  verb: PartialCompoundVerb,
  object: English.NounPhrase,
): PartialCompoundVerb {
  const useForObject = forObject(verb);
  if (useForObject === false) {
    throw new FilteredError("intransitive verb with object");
  } else {
    const [englishObject, prepositions] = useForObject === true
      ? [object, []]
      : [verb.object, [nounAsPreposition(object, useForObject)]];
    return { ...verb, object: englishObject, prepositions };
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
      IterableResult.fromArray<PartialCompoundVerb>([
        {
          type: "simple",
          first: {
            type: "conjugated",
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
            type: "conjugated",
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
    .map(([negated, adjective]): PartialCompoundVerb => ({
      type: "simple",
      first: {
        type: "conjugated",
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
      return IterableResult.from(() =>
        IterableResult.single(verbObject(predicate.verb, object))
      );
  }
}
function associatedPredicate(
  predicate: PhraseTranslation,
  object: null | PhraseTranslation,
  prepositions: ReadonlyArray<English.Preposition>,
) {
  let verbObject: IterableResult<PartialCompoundVerb>;
  if (object == null) {
    verbObject = IterableResult.single(phraseAsVerb(predicate));
  } else if (object.type === "noun") {
    verbObject = predicateVerb(predicate, object.noun);
  } else {
    return IterableResult.errors([
      new UntranslatableError(object.type, "object"),
    ]);
  }
  return verbObject.map((verbObject): PartialCompoundVerb => ({
    ...verbObject,
    prepositions: [...verbObject.prepositions, ...prepositions],
  }));
}
export function predicate(
  tokiPonaPredicate: TokiPona.Predicate,
  andParticle: string,
): IterableResult<PartialCompoundVerb> {
  switch (tokiPonaPredicate.type) {
    case "single":
      return phrase({
        phrase: tokiPonaPredicate.predicate,
        place: "object",
        includeGerund: false,
        includeVerb: true,
      })
        .map(phraseAsVerb);
    case "associated": {
      const predicatePhrase = multiplePhrases({
        phrases: tokiPonaPredicate.predicates,
        place: "object",
        includeGerund: false,
        andParticle,
        includeVerb: true,
      });
      const object = IterableResult.single(tokiPonaPredicate.objects)
        .flatMap((object) => {
          if (object != null) {
            return multiplePhrases({
              phrases: object,
              place: "object",
              includeGerund: true,
              andParticle: "e",
              includeVerb: false,
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
    case "and conjunction":
    case "anu":
      return IterableResult.combine(
        ...tokiPonaPredicate.predicates
          .map((predicates) => predicate(predicates, andParticle)),
      )
        .map((predicates): PartialCompoundVerb => ({
          type: "compound",
          conjunction: CONJUNCTION[tokiPonaPredicate.type],
          verbs: predicates,
          object: null,
          objectComplement: null,
          prepositions: [],
        }));
  }
}
