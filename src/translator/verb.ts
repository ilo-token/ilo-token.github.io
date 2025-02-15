import * as Dictionary from "../../dictionary/type.ts";
import { Output } from "../output.ts";
import { settings } from "../settings.ts";
import * as English from "./ast.ts";
import { Word } from "./ast.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { unemphasized } from "./word.ts";

export type PartialVerb = Dictionary.VerbForms & {
  adverb: Array<English.Word>;
  reduplicationCount: number;
  wordEmphasis: boolean;
  subjectComplement: null | English.Complement;
  object: null | English.NounPhrase;
  preposition: Array<English.Preposition>;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
  phraseEmphasis: boolean;
};
export type PartialCompoundVerb =
  | ({ type: "simple" } & PartialVerb)
  | { type: "compound"; conjunction: string; verb: Array<PartialCompoundVerb> };
export function condenseVerb(present: string, past: string): string {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
export function partialVerb(
  definition: Dictionary.Verb,
  reduplicationCount: number,
  emphasis: boolean,
): Output<PartialVerb> {
  const object = new Output([definition.directObject])
    .flatMap((object) => {
      if (object != null) {
        return noun(object, 1, false);
      } else {
        return new Output([null]);
      }
    });
  const preposition = Output.combine(
    ...definition.indirectObject
      .flatMap((indirectObject) =>
        noun(indirectObject.object, 1, false)
          .map((object) => ({
            preposition: unemphasized(indirectObject.preposition),
            object,
          }))
      ),
  );
  return Output.combine(object, preposition)
    .map(([object, preposition]) => ({
      ...definition,
      adverb: [],
      reduplicationCount,
      wordEmphasis: emphasis,
      subjectComplement: null,
      object,
      preposition,
      phraseEmphasis: false,
    }));
}
export function fromVerbForms(
  verbForms: Dictionary.VerbForms,
  perspective: Dictionary.Perspective,
  quantity: English.Quantity,
  emphasis: boolean,
): Output<English.Verb> {
  const is = verbForms.presentSingular === "is";
  let presentSingular: string;
  if (is && perspective === "first") {
    presentSingular = "am";
  } else {
    presentSingular = verbForms.presentSingular;
  }
  let present: string;
  if (quantity === "singular") {
    present = presentSingular;
  } else {
    present = verbForms.presentPlural;
  }
  let verb: Output<{ modal: null | string; infinite: string }>;
  switch (settings.tense) {
    case "condensed":
      if (is) {
        if (quantity === "condensed") {
          verb = new Output([{
            modal: null,
            infinite:
              `${presentSingular}/${verbForms.presentPlural}/${verbForms.past}/will be`,
          }]);
        } else {
          verb = new Output([{
            modal: null,
            infinite: `${present}/${verbForms.past}/will be`,
          }]);
        }
      } else {
        verb = new Output([{
          modal: "(will)",
          infinite: condenseVerb(present, verbForms.past),
        }]);
      }
      break;
    case "both":
    case "default only": {
      switch (settings.tense) {
        case "both": {
          let future: string;
          if (is) {
            future = "be";
          } else {
            future = verbForms.presentPlural;
          }
          verb = new Output([
            { modal: null, infinite: present },
            { modal: null, infinite: verbForms.past },
            { modal: "will", infinite: future },
          ]);
          break;
        }
        case "default only":
          verb = new Output([{ modal: null, infinite: present }]);
          break;
      }
    }
  }
  return verb.map((verb) => {
    let modal: null | Word = null;
    if (verb.modal != null) {
      modal = unemphasized(verb.modal);
    }
    return {
      modal,
      finite: [],
      infinite: { word: verb.infinite, emphasis },
    };
  });
}
