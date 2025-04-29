import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { settings } from "../settings.ts";
import { fixAdverb, NOT } from "./adverb.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { noEmphasis, word } from "./word.ts";

export type VerbForms =
  & Dictionary.VerbForms
  & Readonly<{
    adverb: ReadonlyArray<English.Adverb>;
    negated: boolean;
    reduplicationCount: number;
    emphasis: boolean;
  }>;
export type VerbObjects = Readonly<{
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  preposition: ReadonlyArray<English.Preposition>;
}>;
export type PartialVerb =
  & VerbObjects
  & Readonly<{
    modal: null | English.AdverbVerb;
    first: null | VerbForms;
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
      verb: ReadonlyArray<PartialCompoundVerb>;
    }>
    & VerbObjects
  );
function condenseVerb(present: string, past: string) {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
function addModal(
  modal: string,
  verb: PartialVerb,
  takeNegative: boolean,
) {
  if (verb.modal == null) {
    const newRest = nullableAsArray(verb.first)
      .map((first) => {
        const { adverb, presentPlural, negated } = first;
        const useVerb = presentPlural === "are" ? "be" : presentPlural;
        const preAdverb = fixAdverb(
          takeNegative ? adverb : [
            ...(negated ? [NOT] : []),
            ...adverb,
          ],
        );
        return {
          preAdverb,
          verb: word({ ...first, word: useVerb }),
          postAdverb: null,
        };
      });
    const postAdverb = takeNegative && (verb.first?.negated ?? false)
      ? NOT
      : null;
    return {
      ...verb,
      modal: {
        preAdverb: [],
        verb: noEmphasis(modal),
        postAdverb,
      },
      first: null,
      rest: [...newRest, ...verb.rest],
      reduplicationCount: 1,
      emphasis: false,
    };
  } else {
    throw new FilteredError("nested modal verb");
  }
}
export function addModalToAll(
  modal: string,
  verb: PartialCompoundVerb,
  takeNegative: boolean,
): PartialCompoundVerb {
  switch (verb.type) {
    case "simple":
      return { ...addModal(modal, verb, takeNegative), type: "simple" };
    case "compound":
      return {
        ...verb,
        verb: verb.verb.map((verb) => addModalToAll(modal, verb, takeNegative)),
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
  const preposition = IterableResult.combine(
    ...definition.indirectObject
      .flatMap(({ object, preposition }) =>
        noun({
          definition: object,
          reduplicationCount: 1,
          emphasis: false,
        })
          .map((object) => nounAsPreposition(object, preposition))
      ),
  );
  return IterableResult.combine(object, preposition)
    .map(([object, preposition]) => ({
      ...definition,
      modal: null,
      first: {
        ...definition,
        adverb: [],
        negated: false,
        reduplicationCount,
        emphasis: emphasis,
      },
      rest: [],
      subjectComplement: null,
      object,
      objectComplement: null,
      preposition,
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
      return verb.verb.flatMap(everyPartialVerb);
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
// TODO: handle negatives
function fromVerbForms(
  options: Readonly<{
    verbForms: VerbForms;
    perspective: Dictionary.Perspective;
    quantity: English.Quantity;
  }>,
): IterableResult<English.Verb> {
  const { verbForms, perspective, quantity } = options;
  const { negated, adverb } = verbForms;
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
  let result: IterableResult<
    Readonly<
      {
        modal: null | English.AdverbVerb;
        doesNot: null | English.AdverbVerb;
        verb: string;
        postAdverb: null | English.Adverb;
      }
    >
  >;
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
              preAdverb: [],
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
                preAdverb: [],
                verb: noEmphasis("will"),
                postAdverb: NOT,
              },
              verb: "be",
              postAdverb: null,
            },
          ])
            .map((options) => ({ ...options, doesNot: null }));
        } else {
          result = IterableResult.fromArray([
            {
              modal: null,
              doesNot: {
                preAdverb: [],
                verb: noEmphasis(does),
                postAdverb: NOT,
              },
            },
            {
              modal: null,
              doesNot: {
                preAdverb: [],
                verb: noEmphasis("did"),
                postAdverb: NOT,
              },
            },
            {
              modal: {
                preAdverb: [],
                verb: noEmphasis("will"),
                postAdverb: NOT,
              },
              doesNot: null,
            },
          ])
            .map((options) => ({
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
          .map((options) => ({
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
              preAdverb: [],
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
  return result.map(({ modal, doesNot, verb, postAdverb }) => ({
    modal,
    verb: [
      ...nullableAsArray(doesNot),
      {
        preAdverb: adverb,
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
    case "simple": {
      const verbForms = partialVerb.first;
      if (verbForms != null) {
        return fromVerbForms({
          verbForms,
          perspective,
          quantity,
        })
          .map((verb) => ({
            ...partialVerb,
            type: "default",
            verb: {
              modal: verb.modal,
              verb: [...verb.verb, ...partialVerb.rest],
            },
            contentClause: null,
            hideVerb: false,
          }));
      } else {
        return IterableResult.single({
          ...partialVerb,
          type: "default",
          verb: { modal: partialVerb.modal, verb: partialVerb.rest },
          contentClause: null,
          hideVerb: false,
        });
      }
    }
    case "compound":
      return IterableResult.combine(
        ...partialVerb.verb.map((partialVerb) =>
          verb(partialVerb, perspective, quantity)
        ),
      )
        .map((verbs) => ({
          ...partialVerb,
          type: "compound",
          verbs,
        }));
  }
}
export function noAdverbs(verb: English.Word): English.AdverbVerb {
  return { preAdverb: [], verb, postAdverb: null };
}
