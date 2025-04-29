import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import { extractNegativeFromAdverbs } from "./adverb.ts";
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
      adverb: [
        ...definition.adverb,
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
      .map((adjective) => ({
        type: "compound",
        conjunction: "and",
        adjective,
        emphasis: false,
      }));
  } else {
    return IterableResult.errors([
      new UntranslatableError("reduplication", "compound adjective"),
    ]);
  }
}
function rankAdjective(kind: Dictionary.AdjectiveType) {
  return [
    "opinion",
    "size",
    "physical quality",
    "age",
    "color",
    "origin",
    "material",
    "qualifier",
  ]
    .indexOf(kind);
}
export function fixAdjective(
  adjective: ReadonlyArray<English.AdjectivePhrase>,
): ReadonlyArray<English.AdjectivePhrase> {
  return adjective
    .flatMap((adjective) => {
      switch (adjective.type) {
        case "simple":
          return [adjective];
        case "compound":
          return adjective.adjective as ReadonlyArray<
            English.AdjectivePhrase & { type: "simple" }
          >;
      }
    })
    .sort((a, b) => rankAdjective(a.kind) - rankAdjective(b.kind));
}
export function extractNegativeFromAdjective(
  adjective: English.AdjectivePhrase,
): null | English.AdjectivePhrase {
  switch (adjective.type) {
    case "simple":
      return mapNullable(
        extractNegativeFromAdverbs(adjective.adverb),
        (adverb) => ({ ...adjective, adverb }),
      );
    case "compound": {
      const adjectives = adjective.adjective.map(extractNegativeFromAdjective);
      if (adjectives.every((adjective) => adjective != null)) {
        return { ...adjective, adjective: adjectives };
      } else {
        return null;
      }
    }
  }
}
