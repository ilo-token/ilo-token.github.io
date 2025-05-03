import { throwError } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { phrase } from "./phrase.ts";

export function nanpa(
  nanpa: TokiPona.Nanpa,
): IterableResult<English.NounPhrase> {
  return phrase({
    phrase: nanpa.phrase,
    place: "object",
    includeGerund: true,
    includeVerb: false,
  })
    .map((phrase) =>
      phrase.type !== "noun"
        ? throwError(
          new FilteredError(
            `${phrase.type} within "position X" phrase`,
          ),
        )
        : {
          type: "simple",
          determiners: [],
          adjectives: [],
          noun: {
            word: "position",
            emphasis: nanpa.nanpa.emphasis != null,
          },
          quantity: "singular",
          perspective: "third",
          postCompound: phrase.noun,
          adjectiveName: null,
          prepositions: [],
          emphasis: false,
        }
    );
}
