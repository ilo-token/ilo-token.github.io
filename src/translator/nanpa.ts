import { throwError } from "../../misc/misc.ts";
import { ArrayResult } from "../array_result.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { phrase } from "./phrase.ts";

export function nanpa(
  nanpa: TokiPona.Modifier & { type: "nanpa" },
): ArrayResult<English.NounPhrase> {
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
        : (phrase.noun as English.NounPhrase & { type: "simple" })
            .preposition.length > 0
        ? throwError(
          new FilteredError('preposition within "position X" phrase'),
        )
        : {
          type: "simple",
          determiner: [],
          adjective: [],
          noun: {
            word: "position",
            emphasis: nanpa.nanpa.emphasis != null,
          },
          quantity: "singular",
          perspective: "third",
          postCompound: phrase.noun,
          postAdjective: null,
          preposition: [],
          emphasis: false,
        }
    );
}
