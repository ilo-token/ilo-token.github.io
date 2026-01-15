import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { UntranslatableError } from "./error.ts";
import { noEmphasis, word } from "./word.ts";

export type AdjectiveWithInWay = Readonly<{
  adjective: English.AdjectivePhrase;
  inWayPhrase: null | English.AdjectivePhrase;
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
    IterableResult.from(() => IterableResult.single(so(emphasis)))
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
  // TODO: flattening of adjectives in AST fixer
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
export function addWay(
  adjective: English.AdjectivePhrase,
): English.SimpleNounPhrase {
  return {
    determiners: [],
    adjectives: [adjective],
    singular: { subject: "way", object: "way" },
    plural: null,
    reduplicationCount: 1,
    wordEmphasis: false,
    perspective: "third",
    adjectiveName: null,
    postCompound: null,
    prepositions: [],
    phraseEmphasis: false,
  };
}
