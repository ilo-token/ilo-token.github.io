import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { settings } from "../settings.ts";
import { NOT } from "./adverb.ts";
import * as English from "./ast.ts";
import { FilteredError } from "../translator2/error.ts";
import { condense } from "../translator2/misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { noEmphasis, word } from "../translator2/word.ts";

export type VerbFormsWithAccessory =
  & Dictionary.VerbForms
  & Readonly<{
    adverbs: ReadonlyArray<English.Adverb>;
    negated: boolean;
    reduplicationCount: number;
    emphasis: boolean;
  }>;
export type VerbAccessory = Readonly<{
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  prepositions: ReadonlyArray<English.Preposition>;
}>;
export type FirstVerb =
  | (Readonly<{ type: "modal" }> & English.Verb)
  | (Readonly<{ type: "non-modal" }> & VerbFormsWithAccessory);
export type PartialSimpleVerb =
  & VerbAccessory
  & Readonly<{
    first: FirstVerb;
    rest: ReadonlyArray<English.Verb>;
    subjectComplement: null | English.Complement;
    forObject: boolean | string;
    predicateType: null | "verb" | "noun adjective";
    emphasis: boolean;
  }>;
export type PartialVerb =
  | (Readonly<{ type: "simple" }> & PartialSimpleVerb)
  | (
    & Readonly<{
      type: "compound";
      conjunction: string;
      verbs: ReadonlyArray<PartialVerb>;
    }>
    & VerbAccessory
  );
function condenseVerb(present: string, past: string) {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
function addModal(
  options: Readonly<{
    modal: string;
    verb: PartialSimpleVerb;
    takeNegative: boolean;
  }>,
): PartialSimpleVerb {
  const { modal, verb, takeNegative } = options;
  const { first } = verb;
  switch (first.type) {
    case "modal":
      throw new FilteredError("nested modal verb");
    case "non-modal": {
      const newRest = nullableAsArray(first)
        .map((first): English.Verb => {
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
    verb: PartialVerb;
    takeNegative: boolean;
  }>,
): PartialVerb {
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
export function partialSimpleVerb(
  options: Readonly<{
    definition: Dictionary.Verb;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<PartialSimpleVerb> {
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
    .map(([object, prepositions]): PartialSimpleVerb => ({
      ...definition,
      first: {
        ...definition,
        type: "non-modal",
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
function flattenPartialVerb(
  verb: PartialVerb,
): ReadonlyArray<PartialSimpleVerb> {
  switch (verb.type) {
    case "simple":
      return [verb];
    case "compound":
      return verb.verbs.flatMap(flattenPartialVerb);
  }
}
// TODO: error messages
export function forObject(verb: PartialVerb): boolean | string {
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
function fromVerbForms(
  verbForms: VerbFormsWithAccessory,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
): IterableResult<English.WholeVerb> {
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
    modal: null | English.Verb;
    doesNot: null | English.Verb;
    verb: string;
    postAdverb: null | English.Adverb;
  }>;
  let result: IterableResult<Result>;
  switch (settings.tense) {
    case "condensed":
      if (negated) {
        if (is) {
          result = IterableResult.single<Result>({
            modal: null,
            doesNot: null,
            verb: `${present} not/${past} not/will not be`,
            postAdverb: null,
          });
        } else {
          result = IterableResult.single<Result>({
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
          result = IterableResult.single<Result>({
            modal: null,
            doesNot: null,
            verb: `${present}/${past}/will be`,
            postAdverb: null,
          });
        } else {
          result = IterableResult.single<Result>({
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
          result = IterableResult.single<Result>({
            modal: null,
            doesNot: null,
            verb: present,
            postAdverb: NOT,
          });
        } else {
          result = IterableResult.single<Result>({
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
        result = IterableResult.single<Result>({
          modal: null,
          doesNot: null,
          verb: present,
          postAdverb: null,
        });
      }
      break;
  }
  return result.map((
    { modal, doesNot, verb, postAdverb },
  ): English.WholeVerb => ({
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
const completeVerb = verb;
export function verb(
  verb: PartialVerb,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
): IterableResult<English.VerbPhrase> {
  switch (verb.type) {
    case "compound":
      return IterableResult.combine(
        ...verb.verbs.map((verb) => completeVerb(verb, perspective, quantity)),
      )
        .map((verbs): English.VerbPhrase => ({
          ...verb,
          type: "compound",
          verbs,
        }));
    case "simple": {
      const { first } = verb;
      switch (first.type) {
        case "modal":
          return IterableResult.single<English.VerbPhrase>({
            ...verb,
            type: "simple",
            verb: { modal: first, verbs: verb.rest },
            contentClause: null,
            hideVerb: false,
          });
        case "non-modal":
          return fromVerbForms(first, perspective, quantity)
            .map((singleVerb): English.VerbPhrase => ({
              ...verb,
              type: "simple",
              verb: {
                modal: singleVerb.modal,
                verbs: [...singleVerb.verbs, ...verb.rest],
              },
              contentClause: null,
              hideVerb: false,
            }));
      }
    }
  }
}
export function noAdverbs(verb: English.Word): English.Verb {
  return { preAdverbs: [], verb, postAdverb: null };
}
