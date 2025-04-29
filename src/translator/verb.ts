import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { settings } from "../settings.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { noEmphasis, word } from "./word.ts";

export type VerbObjects = Readonly<{
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  preposition: ReadonlyArray<English.Preposition>;
}>;
export type PartialVerb =
  & VerbObjects
  & Readonly<{
    modal: null | English.AdverbVerb;
    adverb: ReadonlyArray<English.Adverb>;
    first: null | (Dictionary.VerbForms & Readonly<{ negated: boolean }>);
    reduplicationCount: number;
    wordEmphasis: boolean;
    rest: ReadonlyArray<English.AdverbVerb>;
    subjectComplement: null | English.Complement;
    forObject: boolean | string;
    predicateType: null | "verb" | "noun adjective";
    phraseEmphasis: boolean;
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
export function condenseVerb(present: string, past: string): string {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
export function addModal(
  modal: string,
  verb: PartialVerb,
  takeNegative: boolean,
): PartialVerb {
  if (verb.modal == null) {
    const newRest = nullableAsArray(verb.first)
      .map((first) => {
        const presentPlural = first.presentPlural;
        const useVerb = presentPlural === "are" ? "be" : presentPlural;
        // TODO: fix adverbs
        const preAdverb = takeNegative ? verb.adverb : [
          ...(
            first.negated ? [{ adverb: noEmphasis("not"), negative: true }] : []
          ),
          ...verb.adverb,
        ];
        return {
          preAdverb,
          verb: word({
            word: useVerb,
            reduplicationCount: verb.reduplicationCount,
            emphasis: verb.wordEmphasis,
          }),
          postAdverb: [],
        };
      });
    const postAdverb = takeNegative && (verb.first?.negated ?? false)
      ? [{ adverb: noEmphasis("not"), negative: true }]
      : [];
    return {
      ...verb,
      modal: {
        preAdverb: [],
        verb: noEmphasis(modal),
        postAdverb,
      },
      adverb: [],
      first: null,
      rest: [...newRest, ...verb.rest],
      reduplicationCount: 1,
      wordEmphasis: false,
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
      adverb: [],
      modal: null,
      first: { ...definition, negated: false },
      reduplicationCount,
      wordEmphasis: emphasis,
      rest: [],
      subjectComplement: null,
      object,
      objectComplement: null,
      preposition,
      phraseEmphasis: false,
    }));
}
export function everyPartialVerb(
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
export function fromVerbForms(
  options: Readonly<{
    verbForms: Dictionary.VerbForms;
    perspective: Dictionary.Perspective;
    quantity: English.Quantity;
  }>,
): IterableResult<Readonly<{ modal: null | string; verb: string }>> {
  const { verbForms, perspective, quantity } = options;
  const is = verbForms.presentSingular === "is";
  const presentSingular = is && perspective === "first"
    ? "am"
    : verbForms.presentSingular;
  const [pastPlural, pastSingular] = is
    ? ["were", "was"]
    : [verbForms.past, verbForms.past];
  const [past, present] =
    quantity !== "singular" || (!is && perspective !== "third")
      ? [pastPlural, verbForms.presentPlural]
      : [pastSingular, presentSingular];
  switch (settings.tense) {
    case "condensed":
      if (is) {
        if (quantity === "condensed") {
          return IterableResult.single({
            modal: null,
            verb: "is/are/was/were/will be",
          });
        } else {
          return IterableResult.single({
            modal: null,
            verb: `${present}/${past}/will be`,
          });
        }
      } else {
        return IterableResult.single({
          modal: "(will)",
          verb: condenseVerb(present, past),
        });
      }
    case "both": {
      const future = is ? "be" : verbForms.presentPlural;
      return IterableResult.fromArray([
        { modal: null, verb: present },
        { modal: null, verb: past },
        { modal: "will", verb: future },
      ]);
    }
    case "default only":
      return IterableResult.single({ modal: null, verb: present });
  }
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
              modal: mapNullable(
                mapNullable(verb.modal, noEmphasis),
                noAdverbs,
              ),
              verb: [
                {
                  preAdverb: partialVerb.adverb,
                  verb: word({
                    word: verb.verb,
                    reduplicationCount: partialVerb.reduplicationCount,
                    emphasis: partialVerb.wordEmphasis,
                  }),
                  postAdverb: [],
                },
                ...partialVerb.rest,
              ],
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
  return { preAdverb: [], verb, postAdverb: [] };
}
