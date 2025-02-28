import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array-result.ts";
import { settings } from "../settings.ts";
import * as English from "./ast.ts";
import { Word } from "./ast.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { nounAsPreposition } from "./preposition.ts";
import { unemphasized, word } from "./word.ts";

export type VerbObjects = {
  object: null | English.NounPhrase;
  objectComplement: null | English.Complement;
  preposition: Array<English.Preposition>;
};
export type PartialVerb = Dictionary.VerbForms & VerbObjects & {
  adverb: Array<English.Word>;
  reduplicationCount: number;
  wordEmphasis: boolean;
  subjectComplement: null | English.Complement;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
  phraseEmphasis: boolean;
};
export type PartialCompoundVerb =
  | ({ type: "simple" } & PartialVerb)
  | (
    & {
      type: "compound";
      conjunction: string;
      verb: Array<PartialCompoundVerb>;
    }
    & VerbObjects
  );
export function condenseVerb(present: string, past: string): string {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
export function partialVerb(
  definition: Dictionary.Verb,
  reduplicationCount: number,
  emphasis: boolean,
): ArrayResult<PartialVerb> {
  const object = new ArrayResult([definition.directObject])
    .flatMap((object) => {
      if (object != null) {
        return noun(object, 1, false);
      } else {
        return new ArrayResult([null]);
      }
    });
  const preposition = ArrayResult.combine(
    ...definition.indirectObject
      .flatMap((indirectObject) =>
        noun(indirectObject.object, 1, false)
          .map((object) =>
            nounAsPreposition(object, indirectObject.preposition)
          )
      ),
  );
  return ArrayResult.combine(object, preposition)
    .map(([object, preposition]) => ({
      ...definition,
      adverb: [],
      reduplicationCount,
      wordEmphasis: emphasis,
      subjectComplement: null,
      object,
      objectComplement: null,
      preposition,
      phraseEmphasis: false,
    }));
}
export function everyPartialVerb(
  verb: PartialCompoundVerb,
): Array<PartialVerb> {
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
    forObject === false || rest.some((verb) => forObject !== verb.forObject)
  ) {
    return false;
  }
  return forObject;
}
export function fromVerbForms(
  verbForms: Dictionary.VerbForms,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
  reduplicationCount: number,
  emphasis: boolean,
): ArrayResult<English.Verb> {
  const is = verbForms.presentSingular === "is";
  let presentSingular: string;
  if (is && perspective === "first") {
    presentSingular = "am";
  } else {
    presentSingular = verbForms.presentSingular;
  }
  let pastPlural: string;
  let pastSingular: string;
  if (is) {
    pastPlural = "were";
    pastSingular = "was";
  } else {
    pastPlural = pastSingular = verbForms.past;
  }
  let past: string;
  let present: string;
  if (quantity !== "singular" || (!is && perspective !== "third")) {
    past = pastPlural;
    present = verbForms.presentPlural;
  } else {
    past = pastSingular;
    present = presentSingular;
  }
  let verb: ArrayResult<{ modal: null | string; infinite: string }>;
  switch (settings.tense) {
    case "condensed":
      if (is) {
        if (quantity === "condensed") {
          verb = new ArrayResult([{
            modal: null,
            infinite: `is/are/was/were/will be`,
          }]);
        } else {
          verb = new ArrayResult([{
            modal: null,
            infinite: `${present}/${past}/will be`,
          }]);
        }
      } else {
        verb = new ArrayResult([{
          modal: "(will)",
          infinite: condenseVerb(present, past),
        }]);
      }
      break;
    case "both": {
      let future: string;
      if (is) {
        future = "be";
      } else {
        future = verbForms.presentPlural;
      }
      verb = new ArrayResult([
        { modal: null, infinite: present },
        { modal: null, infinite: past },
        { modal: "will", infinite: future },
      ]);
      break;
    }
    case "default only":
      verb = new ArrayResult([{ modal: null, infinite: present }]);
      break;
  }
  return verb.map((verb) => {
    let modal: null | Word = null;
    if (verb.modal != null) {
      modal = unemphasized(verb.modal);
    }
    return {
      modal,
      finite: [],
      infinite: word(verb.infinite, reduplicationCount, emphasis),
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
      return fromVerbForms(
        partialVerb,
        perspective,
        quantity,
        partialVerb.reduplicationCount,
        partialVerb.wordEmphasis,
      )
        .map<English.VerbPhrase>((verb) => ({
          ...partialVerb,
          type: "default",
          verb,
          hideVerb: false,
        }));
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
