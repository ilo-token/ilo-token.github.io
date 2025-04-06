import { ArrayResult } from "../array_result.ts";
import { nullableAsArray } from "../../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { AdjectiveWithInWay } from "./adjective.ts";
import * as English from "./ast.ts";
import { FilteredError, UntranslatableError } from "./error.ts";
import { CONJUNCTION } from "./misc.ts";
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
    const [englishObject, preposition] = useForObject === true
      ? [object, []]
      : [verb.object, [nounAsPreposition(object, useForObject)]];
    return { ...verb, object: englishObject, preposition };
  }
}
function applyTo(
  predicate: English.NounPhrase,
  object: English.NounPhrase,
): PartialCompoundVerb {
  return {
    type: "simple",
    adverb: [],
    modal: null,
    first: {
      presentPlural: "apply",
      presentSingular: "applies",
      past: "applied",
    },
    reduplicationCount: 1,
    wordEmphasis: false,
    rest: [],
    subjectComplement: null,
    object: predicate,
    objectComplement: null,
    preposition: [nounAsPreposition(object, "to")],
    forObject: false,
    predicateType: null,
    phraseEmphasis: false,
  };
}
function turnInto(
  predicate: English.NounPhrase,
  object: English.NounPhrase,
): PartialCompoundVerb {
  return {
    type: "simple",
    adverb: [],
    modal: null,
    first: {
      presentPlural: "turn",
      presentSingular: "turns",
      past: "turned",
    },
    reduplicationCount: 1,
    wordEmphasis: false,
    rest: [],
    subjectComplement: null,
    object,
    objectComplement: null,
    preposition: [nounAsPreposition(predicate, "into")],
    forObject: false,
    predicateType: null,
    phraseEmphasis: false,
  };
}
function make(
  predicate: AdjectiveWithInWay,
  object: English.NounPhrase,
): PartialCompoundVerb {
  return {
    type: "simple",
    adverb: [],
    modal: null,
    first: {
      presentPlural: "make",
      presentSingular: "makes",
      past: "made",
    },
    reduplicationCount: 1,
    wordEmphasis: false,
    rest: [],
    subjectComplement: null,
    object,
    objectComplement: { type: "adjective", adjective: predicate.adjective },
    preposition: nullableAsArray(predicate.inWayPhrase)
      .map((phrase) => nounAsPreposition(phrase, "in")),
    forObject: false,
    predicateType: null,
    phraseEmphasis: false,
  };
}
function predicateVerb(
  predicate: PhraseTranslation,
  object: English.NounPhrase,
): ArrayResult<PartialCompoundVerb> {
  switch (predicate.type) {
    case "noun":
      return new ArrayResult([
        applyTo(predicate.noun, object),
        turnInto(predicate.noun, object),
      ]);
    case "adjective":
      return new ArrayResult([make(predicate, object)]);
    case "verb":
      return ArrayResult.from(() =>
        new ArrayResult([verbObject(predicate.verb, object)])
      );
  }
}
function associatedPredicate(
  predicate: PhraseTranslation,
  object: null | PhraseTranslation,
  preposition: ReadonlyArray<English.Preposition>,
): ArrayResult<PartialCompoundVerb> {
  let verbObject: ArrayResult<PartialCompoundVerb>;
  if (object == null) {
    verbObject = new ArrayResult([phraseAsVerb(predicate)]);
  } else if (object.type === "noun") {
    verbObject = predicateVerb(predicate, object.noun);
  } else {
    return new ArrayResult(new UntranslatableError(object.type, "object"));
  }
  return verbObject.map((verbObject) => ({
    ...verbObject,
    preposition: [...verbObject.preposition, ...preposition],
  }));
}
export function predicate(
  tokiPonaPredicate: TokiPona.Predicate,
  andParticle: string,
): ArrayResult<PartialCompoundVerb> {
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
      const object = new ArrayResult([tokiPonaPredicate.objects]).flatMap(
        (object) => {
          if (object != null) {
            return multiplePhrases({
              phrases: object,
              place: "object",
              includeGerund: true,
              andParticle: "e",
              includeVerb: false,
            });
          } else {
            return new ArrayResult([null]);
          }
        },
      );
      const prepositionPhrase = ArrayResult.combine(
        ...tokiPonaPredicate.prepositions.map(preposition),
      );
      return ArrayResult.combine(predicatePhrase, object, prepositionPhrase)
        .flatMap(
          ([predicate, object, preposition]) =>
            associatedPredicate(predicate, object, preposition),
        );
    }
    // TODO: combine adjectives and nouns
    case "and conjunction":
    case "anu":
      return ArrayResult.combine(
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
