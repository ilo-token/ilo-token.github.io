import * as Dictionary from "../../dictionary/type.ts";
import { Output } from "../output.ts";
import * as English from "./ast.ts";
import { condense } from "./misc.ts";
import { noun } from "./noun.ts";
import { unemphasized } from "./word.ts";

export type PartialVerb = {
  adverb: Array<English.Word>;
  presentPlural: string;
  presentSingular: string;
  past: string;
  wordEmphasis: boolean;
  reduplicationCount: number;
  subjectComplement: null | English.SubjectComplement;
  object: null | English.NounPhrase;
  preposition: Array<English.Preposition>;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
  phraseEmphasis: boolean;
};
export type PartialCompoundVerb =
  | ({ type: "simple" } & PartialVerb)
  | { type: "compound"; verb: Array<PartialVerb> };
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
        return noun(object, false, 1);
      } else {
        return new Output([null]);
      }
    });
  const preposition = Output.combine(
    ...definition.indirectObject
      .flatMap((indirectObject) =>
        noun(indirectObject.object, false, 1)
          .map((object) => ({
            preposition: unemphasized(indirectObject.preposition),
            object,
          }))
      ),
  );
  return Output.combine(object, preposition)
    .map(([object, preposition]) => ({
      adverb: [],
      presentPlural: definition.presentPlural,
      presentSingular: definition.presentSingular,
      past: definition.past,
      reduplicationCount,
      wordEmphasis: emphasis,
      subjectComplement: null,
      object,
      preposition,
      forObject: definition.forObject,
      predicateType: definition.predicateType,
      phraseEmphasis: false,
    }));
}
