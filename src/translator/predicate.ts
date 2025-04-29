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

function verbObject(verb: PartialCompoundVerb, object: English.NounPhrase) {
  const useForObject = forObject(verb);
  if (useForObject === false) {
    throw new FilteredError("intransitive verb with object");
  } else {
    const [englishObject, preposition] = useForObject === true
      ? [object, []]
      : [verb.object, [nounAsPreposition(object, useForObject)]];
    return { ...verb, object: englishObject, preposition };
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
      IterableResult.fromArray([
        {
          type: "simple",
          modal: null,
          first: {
            adverb: [],
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
          preposition: [nounAsPreposition(object, "to")],
          forObject: false,
          predicateType: null,
          emphasis: false,
        },
        {
          type: "simple",
          modal: null,
          first: {
            adverb: [],
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
          preposition: [nounAsPreposition(predicate, "into")],
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
    .map(([negated, adjective]) => ({
      type: "simple",
      modal: null,
      first: {
        adverb: [],
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
      preposition: nullableAsArray(predicate.inWayPhrase)
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
  preposition: ReadonlyArray<English.Preposition>,
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
  return verbObject.map((verbObject) => ({
    ...verbObject,
    preposition: [...verbObject.preposition, ...preposition],
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
        .map((predicates) => ({
          type: "compound",
          conjunction: CONJUNCTION[tokiPonaPredicate.type],
          verb: predicates,
          object: null,
          objectComplement: null,
          preposition: [],
        }));
  }
}
