import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { settings } from "../settings.ts";
import { NOT } from "./adverb.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { noEmphasis, word } from "./word.ts";

export type VerbForms =
  & Dictionary.VerbForms
  & Readonly<{
    adverbs: ReadonlyArray<English.Adverb>;
    negated: boolean;
    reduplicationCount: number;
    emphasis: boolean;
  }>;
export type VerbObjects = Readonly<{
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  prepositions: ReadonlyArray<English.Preposition>;
}>;
export type FirstVerb =
  | (Readonly<{ type: "modal" }> & English.AdverbVerb)
  | (Readonly<{ type: "conjugated" }> & VerbForms);
export type PartialVerb =
  & VerbObjects
  & Readonly<{
    first: FirstVerb;
    rest: ReadonlyArray<English.AdverbVerb>;
    subjectComplement: null | English.Complement;
    forObject: boolean | string;
    predicateType: null | "verb" | "noun adjective";
    emphasis: boolean;
  }>;
export type PartialCompoundVerb =
  | (Readonly<{ type: "simple" }> & PartialVerb)
  | (
    & Readonly<{
      type: "compound";
      conjunction: string;
      verbs: ReadonlyArray<PartialCompoundVerb>;
    }>
    & VerbObjects
  );
function condenseVerb(present: string, past: string) {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
function addModal(
  options: Readonly<{
    modal: string;
    verb: PartialVerb;
    takeNegative: boolean;
  }>,
): PartialVerb {
  const { modal, verb, takeNegative } = options;
  const { first } = verb;
  switch (first.type) {
    case "modal":
      throw new FilteredError("nested modal verb");
    case "conjugated": {
      const newRest = nullableAsArray(first)
        .map((first): English.AdverbVerb => {
          const { adverbs, presentPlural, negated } = first;
          const useVerb = presentPlural === "are" ? "be" : presentPlural;
          const preAdverbs = takeNegative ? adverbs : [
            ...(negated ? [NOT] : []),
            ...adverbs,
          ];
          return {
            preAdverbs,
            verb: word({ ...first, word: useVerb }),
            postAdverb: null,
          };
        });
      const postAdverb = takeNegative && (first.negated ?? false) ? NOT : null;
      return {
        ...verb,
        first: {
          type: "modal",
          preAdverbs: [],
          verb: noEmphasis(modal),
          postAdverb,
        },
        rest: [...newRest, ...verb.rest],
        emphasis: false,
      };
    }
  }
}
export function addModalToAll(
  options: Readonly<{
    modal: string;
    verb: PartialCompoundVerb;
    takeNegative: boolean;
  }>,
): PartialCompoundVerb {
  const { modal, verb, takeNegative } = options;
  switch (verb.type) {
    case "simple":
      return { ...addModal({ modal, verb, takeNegative }), type: "simple" };
    case "compound":
      return {
        ...verb,
        verbs: verb.verbs.map((verb) =>
          addModalToAll({ modal, verb, takeNegative })
        ),
      };
  }
}
export function partialVerb(
  options: Readonly<{
    definition: Dictionary.Verb;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<PartialVerb> {
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
          .map((object) => nounAsPreposition(object, preposition))
      ),
  );
  return IterableResult.combine(object, prepositions)
    .map(([object, prepositions]): PartialVerb => ({
      ...definition,
      first: {
        ...definition,
        type: "conjugated",
        adverbs: [],
        negated: false,
        reduplicationCount,
        emphasis: emphasis,
      },
      rest: [],
      subjectComplement: null,
      object,
      objectComplement: null,
      prepositions,
      emphasis: false,
    }));
}
function everyPartialVerb(
  verb: PartialCompoundVerb,
): ReadonlyArray<PartialVerb> {
  switch (verb.type) {
    case "simple":
      return [verb];
    case "compound":
      return verb.verbs.flatMap(everyPartialVerb);
  }
}
// TODO: error messages
export function forObject(verb: PartialCompoundVerb): boolean | string {
  const [{ forObject }, ...rest] = everyPartialVerb(verb);
  if (
    forObject !== false &&
    rest.every(({ forObject: otherForObject }) => forObject === otherForObject)
  ) {
    return forObject;
  } else {
    return false;
  }
}
function fromVerbForms(
  verbForms: VerbForms,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
): IterableResult<English.Verb> {
  const { negated, adverbs } = verbForms;
  const is = verbForms.presentSingular === "is";
  const presentSingular = is && perspective === "first"
    ? "am"
    : verbForms.presentSingular;
  const [pastPlural, pastSingular] = is
    ? ["were", "was"]
    : [verbForms.past, verbForms.past];
  const [past, present, does] =
    quantity !== "singular" || (!is && perspective !== "third")
      ? [pastPlural, verbForms.presentPlural, "do"]
      : [pastSingular, presentSingular, "does"];
  type Result = Readonly<{
    modal: null | English.AdverbVerb;
    doesNot: null | English.AdverbVerb;
    verb: string;
    postAdverb: null | English.Adverb;
  }>;
  let result: IterableResult<Result>;
  switch (settings.tense) {
    case "condensed":
      if (negated) {
        if (is) {
          result = IterableResult.single({
            modal: null,
            doesNot: null,
            verb: `${present} not/${past} not/will not be`,
            postAdverb: null,
          });
        } else {
          result = IterableResult.single({
            modal: null,
            doesNot: {
              preAdverbs: [],
              verb: noEmphasis(`${does} not/did not/will not`),
              postAdverb: null,
            },
            verb: verbForms.presentPlural,
            postAdverb: null,
          });
        }
      } else {
        if (is) {
          result = IterableResult.single({
            modal: null,
            doesNot: null,
            verb: `${present}/${past}/will be`,
            postAdverb: null,
          });
        } else {
          result = IterableResult.single({
            modal: noAdverbs(noEmphasis("(will)")),
            doesNot: null,
            verb: condenseVerb(present, past),
            postAdverb: null,
          });
        }
      }
      break;
    case "both":
      if (negated) {
        if (is) {
          result = IterableResult.fromArray([
            { modal: null, verb: present, postAdverb: NOT },
            { modal: null, verb: past, postAdverb: NOT },
            {
              modal: {
                preAdverbs: [],
                verb: noEmphasis("will"),
                postAdverb: NOT,
              },
              verb: "be",
              postAdverb: null,
            },
          ])
            .map((options): Result => ({ ...options, doesNot: null }));
        } else {
          result = IterableResult.fromArray([
            {
              modal: null,
              doesNot: {
                preAdverbs: [],
                verb: noEmphasis(does),
                postAdverb: NOT,
              },
            },
            {
              modal: null,
              doesNot: {
                preAdverbs: [],
                verb: noEmphasis("did"),
                postAdverb: NOT,
              },
            },
            {
              modal: {
                preAdverbs: [],
                verb: noEmphasis("will"),
                postAdverb: NOT,
              },
              doesNot: null,
            },
          ])
            .map((options): Result => ({
              ...options,
              verb: verbForms.presentPlural,
              postAdverb: null,
            }));
        }
      } else {
        const future = is ? "be" : verbForms.presentPlural;
        result = IterableResult.fromArray([
          { modal: null, verb: present },
          { modal: null, verb: past },
          { modal: noAdverbs(noEmphasis("will")), verb: future },
        ])
          .map((options): Result => ({
            ...options,
            doesNot: null,
            postAdverb: null,
          }));
      }
      break;
    case "default only":
      if (negated) {
        if (is) {
          result = IterableResult.single({
            modal: null,
            doesNot: null,
            verb: present,
            postAdverb: NOT,
          });
        } else {
          result = IterableResult.single({
            modal: null,
            doesNot: {
              preAdverbs: [],
              verb: noEmphasis(does),
              postAdverb: NOT,
            },
            verb: verbForms.presentPlural,
            postAdverb: null,
          });
        }
      } else {
        result = IterableResult.single({
          modal: null,
          doesNot: null,
          verb: present,
          postAdverb: null,
        });
      }
      break;
  }
  return result.map(({ modal, doesNot, verb, postAdverb }): English.Verb => ({
    modal,
    verbs: [
      ...nullableAsArray(doesNot),
      {
        preAdverbs: adverbs,
        verb: word({ ...verbForms, word: verb }),
        postAdverb,
      },
    ],
  }));
}
export function verb(
  partialVerb: PartialCompoundVerb,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
): IterableResult<English.VerbPhrase> {
  switch (partialVerb.type) {
    case "compound":
      return IterableResult.combine(
        ...partialVerb.verbs.map((partialVerb) =>
          verb(partialVerb, perspective, quantity)
        ),
      )
        .map((verbs): English.VerbPhrase => ({
          ...partialVerb,
          type: "compound",
          verbs,
        }));
    case "simple": {
      const { first } = partialVerb;
      switch (first.type) {
        case "modal":
          return IterableResult.single({
            ...partialVerb,
            type: "simple",
            verb: { modal: first, verbs: partialVerb.rest },
            contentClause: null,
            hideVerb: false,
          });
        case "conjugated":
          return fromVerbForms(first, perspective, quantity)
            .map((verb): English.VerbPhrase => ({
              ...partialVerb,
              type: "simple",
              verb: {
                modal: verb.modal,
                verbs: [...verb.verbs, ...partialVerb.rest],
              },
              contentClause: null,
              hideVerb: false,
            }));
      }
    }
  }
}
export function noAdverbs(verb: English.Word): English.AdverbVerb {
  return { preAdverbs: [], verb, postAdverb: null };
}
