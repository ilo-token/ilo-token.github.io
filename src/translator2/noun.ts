import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { adjective } from "./adjective.ts";
import * as English from "./ast.ts";

export function noun(
  options: Readonly<{
    definition: Dictionary.Noun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<English.SimpleNounPhrase> {
  const { definition, emphasis } = options;
  const adjectives = IterableResult.combine(
    ...definition.adjectives
      .map((definition) =>
        adjective({ definition, reduplicationCount: 1, emphasis: null })
      ),
  );
  return IterableResult.combine(adjectives)
    .map(([adjectives]): English.SimpleNounPhrase => ({
      ...options,
      ...definition,
      singular: mapNullable(
        definition.singular,
        (noun) => ({ subject: noun, object: noun }),
      ),
      plural: mapNullable(
        definition.plural,
        (noun) => ({ subject: noun, object: noun }),
      ),
      determiners: definition.determiners.map((determiner) => ({
        ...determiner,
        reduplicationCount: 1,
        emphasis: false,
      })),
      adjectives,
      wordEmphasis: emphasis,
      postCompound: null,
      prepositions: [],
      perspective: "third",
      phraseEmphasis: false,
    }));
}
