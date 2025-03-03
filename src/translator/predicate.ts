import { ArrayResult } from "../array_result.ts";
import { nullableAsArray } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { AdjectiveWithInWay } from "./adjective.ts";
import * as English from "./ast.ts";
import { FilteredOutError, UntranslatableError } from "./error.ts";
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
    throw new FilteredOutError("intransitive verb with object");
  } else {
    let englishObject: null | English.NounPhrase;
    let preposition: ReadonlyArray<English.Preposition>;
    if (useForObject === true) {
      englishObject = object;
      preposition = [];
    } else {
      englishObject = verb.object;
      preposition = [nounAsPreposition(object, useForObject)];
    }
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
    presentPlural: "apply",
    presentSingular: "applies",
    past: "applied",
    reduplicationCount: 1,
    wordEmphasis: false,
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
    presentPlural: "turn",
    presentSingular: "turns",
    past: "turned",
    reduplicationCount: 1,
    wordEmphasis: false,
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
    presentPlural: "make",
    presentSingular: "makes",
    past: "made",
    reduplicationCount: 1,
    wordEmphasis: false,
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
  return ArrayResult.from(() => {
    let verbObject: ArrayResult<PartialCompoundVerb>;
    if (object == null) {
      verbObject = new ArrayResult([phraseAsVerb(predicate)]);
    } else if (object.type === "noun") {
      verbObject = predicateVerb(predicate, object.noun);
    } else {
      throw new UntranslatableError(object.type, "object");
    }
    return verbObject.map((verbObject) => ({
      ...verbObject,
      preposition: [...verbObject.preposition, ...preposition],
    }));
  });
}
export function predicate(
  tokiPonaPredicate: TokiPona.Predicate,
  andParticle: string,
): ArrayResult<PartialCompoundVerb> {
  switch (tokiPonaPredicate.type) {
    case "single":
      return phrase(tokiPonaPredicate.predicate, "object", false, true)
        .map(phraseAsVerb);
    case "associated": {
      const predicatePhrase = multiplePhrases(
        tokiPonaPredicate.predicates,
        "object",
        false,
        andParticle,
        true,
      );
      const object = new ArrayResult([tokiPonaPredicate.objects]).flatMap(
        (object) => {
          if (object != null) {
            return multiplePhrases(object, "object", true, "e", false);
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
        .map<PartialCompoundVerb>((predicates) => ({
          type: "compound",
          conjunction: CONJUNCTION[tokiPonaPredicate.type],
          verb: predicates,
          object: null,
          objectComplement: null,
          preposition: [],
        }));
  }
}
