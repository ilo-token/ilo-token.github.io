import { IterableResult } from "../compound.ts";
import { throwError } from "../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { adverbialIsNone } from "./modifier.ts";
import { phrase } from "./phrase.ts";

export function nanpa(
  nanpa: TokiPona.Nanpa,
): IterableResult<English.SimpleNounPhrase> {
  return phrase({
    phrase: nanpa.phrase,
    includeGerund: true,
  })
    .filterMap((phrase): null | English.SimpleNounPhrase =>
      phrase.type !== "noun"
        ? throwError(
          new FilteredError(
            `${phrase.type} within "position X" phrase`,
          ),
        )
        : adverbialIsNone(phrase.adverbialModifier)
        ? {
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
          gerund: false,
        }
        : null
    );
}
