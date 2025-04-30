import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import { extractNegativeFromMultipleAdverbs } from "./adverb.ts";
import * as English from "./ast.ts";
import { UntranslatableError } from "./error.ts";
import { noEmphasis, word } from "./word.ts";

export type AdjectiveWithInWay = Readonly<{
  adjective: English.AdjectivePhrase;
  inWayPhrase: null | English.NounPhrase;
}>;
function so(emphasis: null | TokiPona.Emphasis) {
  if (emphasis == null) {
    throw new UntranslatableError("missing emphasis", "adverb");
  } else {
    switch (emphasis.type) {
      case "word":
        return "so";
      case "long word":
        return `s${"o".repeat(emphasis.length)}`;
    }
  }
}
export function adjective(
  options: Readonly<{
    definition: Dictionary.Adjective;
    reduplicationCount: number;
    emphasis: null | TokiPona.Emphasis;
  }>,
): IterableResult<English.AdjectivePhrase & { type: "simple" }> {
  const { definition, reduplicationCount, emphasis } = options;
  return IterableResult.concat<{ emphasis: boolean; so: null | string }>(
    IterableResult.from(() => IterableResult.single(so(emphasis)))
      .map((so) => ({ emphasis: false, so })),
    IterableResult.single({ emphasis: emphasis != null, so: null }),
  )
    .map(({ emphasis, so }) => ({
      type: "simple",
      kind: definition.kind,
      adverbs: [
        ...definition.adverbs,
        ...nullableAsArray(so).map((so) => ({ adverb: so, negative: false })),
      ]
        .map((adverb) => ({
          adverb: noEmphasis(adverb.adverb),
          negative: adverb.negative,
        })),
      adjective: word({
        word: definition.adjective,
        reduplicationCount,
        emphasis,
      }),
      emphasis: false,
    }));
}
export function compoundAdjective(
  options: Readonly<{
    adjectives: ReadonlyArray<Dictionary.Adjective>;
    reduplicationCount: number;
    emphasis: null | TokiPona.Emphasis;
  }>,
): IterableResult<English.AdjectivePhrase & { type: "compound" }> {
  const { adjectives, reduplicationCount, emphasis } = options;
  if (reduplicationCount === 1) {
    return IterableResult.combine(
      ...adjectives
        .map((definition) =>
          adjective({ definition, reduplicationCount: 1, emphasis })
        ),
    )
      .map((adjectives) => ({
        type: "compound",
        conjunction: "and",
        adjectives,
        emphasis: false,
      }));
  } else {
    return IterableResult.errors([
      new UntranslatableError("reduplication", "compound adjective"),
    ]);
  }
}
export function extractNegativeFromAdjective(
  adjective: English.AdjectivePhrase,
): null | English.AdjectivePhrase {
  switch (adjective.type) {
    case "simple":
      return mapNullable(
        extractNegativeFromMultipleAdverbs(adjective.adverbs),
        (adverb) => ({ ...adjective, adverb }),
      );
    case "compound": {
      const adjectives = adjective.adjectives.map(extractNegativeFromAdjective);
      if (adjectives.every((adjective) => adjective != null)) {
        return { ...adjective, adjectives };
      } else {
        return null;
      }
    }
  }
}
