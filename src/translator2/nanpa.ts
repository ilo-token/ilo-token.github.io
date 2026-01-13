import * as TokiPona from "../parser/ast.ts";
import { IterableResult } from "../compound.ts";
import * as English from "./ast.ts";
import { phrase } from "./phrase.ts";
import { throwError } from "../../misc/misc.ts";
import { FilteredError } from "./error.ts";

export function nanpa(
  nanpa: TokiPona.Nanpa,
): IterableResult<English.SimpleNounPhrase> {
  return phrase({
    phrase: nanpa.phrase,
    includeGerund: true,
  })
    .map((phrase): English.SimpleNounPhrase =>
      phrase.type !== "noun"
        ? throwError(
          new FilteredError(
            `${phrase.type} within "position X" phrase`,
          ),
        )
        : {
          determiners: [],
          adjectives: [],
          singular: { subject: "position", object: "position" },
          plural: null,
          reduplicationCount: 1,
          wordEmphasis: false,
          perspective: "third",
          postCompound: phrase.noun,
          adjectiveName: null,
          prepositions: [],
          phraseEmphasis: false,
        }
    );
}
