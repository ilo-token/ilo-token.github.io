import { IterableResult } from "../compound.ts";
import { nullableAsArray } from "../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { CONJUNCTION } from "./conjuction.ts";
import { multiplePhrases, phrase } from "./phrase.ts";
import { preposition } from "./preposition.ts";
import { phraseAsVerb } from "./phrase.ts";
import { PhraseTranslation } from "./phrase.ts";
import { AdjectiveWithInWay, shareAdverb } from "./adjective.ts";
import { addWay } from "./adjective.ts";
import * as English from "./ast.ts";
import { AdverbialModifier } from "./modifier.ts";
import { nounAsPreposition } from "./preposition.ts";
import { FilteredError, UntranslatableError } from "./error.ts";
import { forObject } from "./verb.ts";

function verbObject(
  verb: English.VerbPhrase,
  object: English.NounPhrase,
): English.VerbPhrase {
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
  adverbial: AdverbialModifier,
  object: English.NounPhrase,
) {
  return IterableResult.fromArray<English.VerbPhrase>([
    {
      type: "simple",
      verb: [
        {
          verb: {
            type: "non-modal",
            presentPlural: "apply",
            presentSingular: "applies",
            past: "applied",
            reduplicationCount: 1,
            emphasis: false,
          },
          preAdverbs: adverbial.adverbs,
          postAdverb: null,
        },
      ],
      subjectComplement: null,
      contentClause: null,
      object: predicate,
      objectComplement: null,
      prepositions: [
        nounAsPreposition(object, "to"),
        ...nullableAsArray(adverbial.inWayPhrase)
          .map((adjective) =>
            nounAsPreposition({ ...addWay(adjective), type: "simple" }, "in")
          ),
      ],
      forObject: false,
      predicateType: null,
      emphasis: false,
      hideVerb: false,
    },
    {
      type: "simple",
      verb: [
        {
          verb: {
            type: "non-modal",
            presentPlural: "turn",
            presentSingular: "turns",
            past: "turned",
            reduplicationCount: 1,
            emphasis: false,
          },
          preAdverbs: adverbial.adverbs,
          postAdverb: null,
        },
      ],
      subjectComplement: null,
      contentClause: null,
      object,
      objectComplement: null,
      prepositions: [
        nounAsPreposition(predicate, "into"),
        ...nullableAsArray(adverbial.inWayPhrase)
          .map((adjective) =>
            nounAsPreposition({ ...addWay(adjective), type: "simple" }, "in")
          ),
      ],
      forObject: false,
      predicateType: null,
      emphasis: false,
      hideVerb: false,
    },
  ]);
}
function make(predicate: AdjectiveWithInWay, object: English.NounPhrase) {
  return shareAdverb(predicate.adjective).map(
    ([adjective, adverbs]): English.VerbPhrase => ({
      type: "simple",
      verb: [
        {
          verb: {
            type: "non-modal",
            presentPlural: "make",
            presentSingular: "makes",
            past: "made",
            reduplicationCount: 1,
            emphasis: false,
          },
          preAdverbs: adverbs,
          postAdverb: null,
        },
      ],
      subjectComplement: null,
      contentClause: null,
      object,
      objectComplement: {
        type: "adjective",
        adjective,
      },
      prepositions: nullableAsArray(predicate.inWayPhrase)
        .map((adjective) =>
          nounAsPreposition({ ...addWay(adjective), type: "simple" }, "in")
        ),
      forObject: false,
      predicateType: null,
      emphasis: false,
      hideVerb: false,
    }),
  );
}
function predicateVerb(
  predicate: PhraseTranslation,
  object: English.NounPhrase,
) {
  switch (predicate.type) {
    case "noun":
      return applyToAndTurnInto(
        predicate.noun,
        predicate.adverbialModifier,
        object,
      );
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
  let verbObject: IterableResult<English.VerbPhrase>;
  if (object == null) {
    verbObject = IterableResult.fromNullable(phraseAsVerb(predicate));
  } else if (object.type === "noun") {
    verbObject = predicateVerb(predicate, object.noun);
  } else {
    return IterableResult.errors([
      new UntranslatableError(object.type, "object"),
    ]);
  }
  return verbObject.map((verbObject): English.VerbPhrase => ({
    ...verbObject,
    prepositions: [...verbObject.prepositions, ...prepositions],
  }));
}
export function predicate(
  tokiPonaPredicate: TokiPona.Predicate,
  andParticle: string,
): IterableResult<English.VerbPhrase> {
  switch (tokiPonaPredicate.type) {
    case "simple":
      return phrase(tokiPonaPredicate.predicate)
        .filterMap(phraseAsVerb);
    case "associated": {
      const predicatePhrase = multiplePhrases(tokiPonaPredicate.predicates);
      const object = IterableResult.single(tokiPonaPredicate.objects)
        .flatMap((object) => {
          if (object != null) {
            return multiplePhrases(object);
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
        .map((predicates): English.VerbPhrase => ({
          type: "compound",
          conjunction: CONJUNCTION[tokiPonaPredicate.type],
          verbs: predicates,
          object: null,
          objectComplement: null,
          prepositions: [],
        }));
  }
}
