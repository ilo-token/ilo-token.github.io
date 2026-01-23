import { IterableResult } from "../compound.ts";
import * as Dictionary from "../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "../resolver_and_composer/ast.ts";
import { UntranslatableError } from "../translator/error.ts";
import { noEmphasis, word } from "../translator/word.ts";
import { extractNegativeFromMultipleAdverbs } from "./adverb.ts";

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
): IterableResult<English.AdjectivePhrase> {
  const { definition, reduplicationCount, emphasis } = options;
  type EmphasisSo = Readonly<{ emphasis: boolean; so: null | string }>;
  return IterableResult.concat(
    IterableResult.handleThrows(() => IterableResult.single(so(emphasis)))
      .map((so): EmphasisSo => ({ emphasis: false, so })),
    IterableResult.single<EmphasisSo>({ emphasis: emphasis != null, so: null }),
  )
    .map(({ emphasis, so }): English.AdjectivePhrase => ({
      type: "simple",
      kind: definition.kind,
      adverbs: [
        ...definition.adverbs,
        ...nullableAsArray(so).map((so): Dictionary.Adverb => ({
          adverb: so,
          negative: false,
        })),
      ]
        .map(({ adverb, negative }): English.Adverb => ({
          adverb: noEmphasis(adverb),
          negative: negative,
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
): IterableResult<English.AdjectivePhrase> {
  const { adjectives, reduplicationCount, emphasis } = options;
  if (reduplicationCount === 1) {
    return IterableResult.combine(
      ...adjectives
        .map((definition) =>
          adjective({ definition, reduplicationCount: 1, emphasis })
        ),
    )
      .map((adjectives) => combineAdjective("and", adjectives));
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
        (adverbs): English.AdjectivePhrase => ({ ...adjective, adverbs }),
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
export function combineAdjective(
  conjunction: string,
  phrases: ReadonlyArray<English.AdjectivePhrase>,
): English.AdjectivePhrase {
  return {
    type: "compound",
    conjunction,
    adjectives: phrases
      .flatMap((adjective) => {
        if (
          adjective.type === "compound" &&
          adjective.conjunction === conjunction
        ) {
          return adjective.adjectives;
        } else {
          return [adjective];
        }
      }),
  };
}
