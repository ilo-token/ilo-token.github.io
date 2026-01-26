import { IterableResult } from "../compound.ts";
import * as Dictionary from "../dictionary/type.ts";
import { mapNullable } from "../misc.ts";
import * as English from "./ast.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";

export function verb(
  options: Readonly<{
    definition: Dictionary.Verb;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<English.SimpleVerbPhrase> {
  const { definition, reduplicationCount, emphasis } = options;
  const object = IterableResult.single(definition.directObject)
    .flatMap((object) => {
      if (object != null) {
        return noun({
          definition: object,
          reduplicationCount: 1,
          emphasis: false,
        });
      } else {
        return IterableResult.single(null);
      }
    });
  const prepositions = IterableResult.combine(
    ...definition.indirectObjects
      .flatMap(({ object, preposition }) =>
        noun({
          definition: object,
          reduplicationCount: 1,
          emphasis: false,
        })
          .map((object) =>
            nounAsPreposition({ type: "simple", ...object }, preposition)
          )
      ),
  );
  return IterableResult.combine(object, prepositions)
    .map(([object, prepositions]): English.SimpleVerbPhrase => ({
      ...definition,
      verb: [
        {
          preAdverbs: [],
          verb: {
            ...definition,
            type: "non-modal",
            reduplicationCount,
            emphasis: emphasis,
          },
          postAdverb: null,
        },
      ],
      subjectComplement: null,
      contentClause: null,
      object: mapNullable(object, (object) => ({ type: "simple", ...object })),
      objectComplement: null,
      prepositions,
      hideVerb: false,
      emphasis,
    }));
}
// TODO: error messages
export function forObject(verb: English.VerbPhrase): boolean | string {
  const [{ forObject }, ...rest] = flattenPartialVerb(verb);
  if (
    forObject !== false &&
    rest.every(({ forObject: otherForObject }) => forObject === otherForObject)
  ) {
    return forObject;
  } else {
    return false;
  }
}
function flattenPartialVerb(
  verb: English.VerbPhrase,
): ReadonlyArray<English.SimpleVerbPhrase> {
  switch (verb.type) {
    case "simple":
      return [verb];
    case "compound":
      return verb.verbs.flatMap(flattenPartialVerb);
  }
}
export function addVerbBefore(
  verb: English.VerbPhrase,
  verbToAdd: English.AdverbVerb,
): English.VerbPhrase {
  switch (verb.type) {
    case "simple":
      return { ...verb, verb: [verbToAdd, ...verb.verb] };
    case "compound":
      return {
        ...verb,
        verbs: verb.verbs.map((verb) => addVerbBefore(verb, verbToAdd)),
      };
  }
}
