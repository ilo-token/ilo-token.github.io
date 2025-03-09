import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array_result.ts";
import { mapNullable, nullableAsArray } from "../misc.ts";
import { settings } from "../settings.ts";
import * as English from "./ast.ts";
import { FilteredOutError } from "./error.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { unemphasized, word } from "./word.ts";

export type VerbObjects = Readonly<{
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  preposition: ReadonlyArray<English.Preposition>;
}>;
export type PartialVerb =
  & VerbObjects
  & Readonly<{
    adverb: ReadonlyArray<English.Word>;
    modal: null | English.Word;
    // TODO: better name other than first and rest
    first: null | Dictionary.VerbForms;
    reduplicationCount: number;
    wordEmphasis: boolean;
    rest: ReadonlyArray<English.Word>;
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
export function addModal(modal: English.Word, verb: PartialVerb): PartialVerb {
  if (verb.modal == null) {
    const newRest = nullableAsArray(verb.first)
      .map(({ presentPlural }) => presentPlural)
      .map((verb) => verb === "are" ? "be" : verb)
      .map((newVerb) =>
        word({
          word: newVerb,
          reduplicationCount: verb.reduplicationCount,
          emphasis: verb.wordEmphasis,
        })
      );
    return {
      ...verb,
      modal,
      first: null,
      rest: [...newRest, ...verb.rest],
      reduplicationCount: 1,
      wordEmphasis: false,
    };
  } else {
    throw new FilteredOutError("nested modal verb");
  }
}
export function addModalToAll(
  modal: English.Word,
  verb: PartialCompoundVerb,
): PartialCompoundVerb {
  switch (verb.type) {
    case "simple":
      return { ...addModal(modal, verb), type: "simple" };
    case "compound":
      return {
        ...verb,
        verb: verb.verb.map((verb) => addModalToAll(modal, verb)),
      };
  }
}
export function partialVerb(
  options: Readonly<{
    definition: Dictionary.Verb;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): ArrayResult<PartialVerb> {
  const { definition, reduplicationCount, emphasis } = options;
  const object = new ArrayResult([definition.directObject])
    .flatMap((object) => {
      if (object != null) {
        return noun({
          definition: object,
          reduplicationCount: 1,
          emphasis: false,
        });
      } else {
        return new ArrayResult([null]);
      }
    });
  const preposition = ArrayResult.combine(
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
  return ArrayResult.combine(object, preposition)
    .map(([object, preposition]) => ({
      ...definition,
      adverb: [],
      modal: null,
      first: definition,
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
export function fromVerbForms(
  options: Readonly<{
    verbForms: Dictionary.VerbForms;
    perspective: Dictionary.Perspective;
    quantity: English.Quantity;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): ArrayResult<English.Verb> {
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
  let verb: ArrayResult<{ modal: null | string; verb: string }>;
  switch (settings.tense) {
    case "condensed":
      if (is) {
        if (quantity === "condensed") {
          verb = new ArrayResult([{
            modal: null,
            verb: "is/are/was/were/will be",
          }]);
        } else {
          verb = new ArrayResult([{
            modal: null,
            verb: `${present}/${past}/will be`,
          }]);
        }
      } else {
        verb = new ArrayResult([{
          modal: "(will)",
          verb: condenseVerb(present, past),
        }]);
      }
      break;
    case "both": {
      const future = is ? "be" : verbForms.presentPlural;
      verb = new ArrayResult([
        { modal: null, verb: present },
        { modal: null, verb: past },
        { modal: "will", verb: future },
      ]);
      break;
    }
    case "default only":
      verb = new ArrayResult([{ modal: null, verb: present }]);
      break;
  }
  return verb.map(({ modal, verb }) => {
    return {
      modal: mapNullable(modal, unemphasized),
      verb: [word({ ...options, word: verb })],
    };
  });
}
export function verb(
  partialVerb: PartialCompoundVerb,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
): ArrayResult<English.VerbPhrase> {
  switch (partialVerb.type) {
    case "simple": {
      const verbForms = partialVerb.first;
      if (verbForms != null) {
        return fromVerbForms({
          verbForms,
          perspective,
          quantity,
          reduplicationCount: partialVerb.reduplicationCount,
          emphasis: partialVerb.wordEmphasis,
        })
          .map<English.VerbPhrase>((verb) => ({
            ...partialVerb,
            type: "default",
            verb,
            contentClause: null,
            hideVerb: false,
          }));
      } else {
        return new ArrayResult([{
          ...partialVerb,
          type: "default",
          verb: { modal: partialVerb.modal, verb: partialVerb.rest },
          contentClause: null,
          hideVerb: false,
        }]);
      }
    }
    case "compound":
      return ArrayResult.combine(
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
