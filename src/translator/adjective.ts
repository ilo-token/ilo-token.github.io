import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { ArrayResult } from "../array-result.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { UntranslatableError } from "./error.ts";
import { unemphasized, word } from "./word.ts";

export type AdjectiveWithInWay = {
  adjective: English.AdjectivePhrase;
  inWayPhrase: null | English.NounPhrase;
};
function so(emphasis: null | TokiPona.Emphasis): string {
  if (emphasis == null) {
    throw new UntranslatableError("missing emphasis", "adverb");
  } else {
    switch (emphasis.type) {
      case "word":
        return "so";
      case "long word":
        return `s${"o".repeat(emphasis.length)}`;
      case "multiple a":
        throw new UntranslatableError(
          `"${repeatWithSpace("a", emphasis.count)}"`,
          "adverb",
        );
    }
  }
}
export function adjective(
  definition: Dictionary.Adjective,
  reduplicationCount: number,
  emphasis: null | TokiPona.Emphasis,
): ArrayResult<English.AdjectivePhrase & { type: "simple" }> {
  return ArrayResult.concat<{ emphasis: boolean; so: null | string }>(
    ArrayResult.from(() => new ArrayResult([so(emphasis)]))
      .map((so) => ({ emphasis: false, so })),
    new ArrayResult([{ emphasis: emphasis != null, so: null }]),
  )
    .map(({ emphasis, so }) => ({
      type: "simple",
      kind: definition.kind,
      adverb: [...definition.adverb, ...nullableAsArray(so)].map(unemphasized),
      adjective: word(definition.adjective, reduplicationCount, emphasis),
      emphasis: false,
    }));
}
export function compoundAdjective(
  adjectives: Array<Dictionary.Adjective>,
  reduplicationCount: number,
  emphasis: null | TokiPona.Emphasis,
): ArrayResult<English.AdjectivePhrase & { type: "compound" }> {
  return ArrayResult.from(() => {
    if (reduplicationCount === 1) {
      return ArrayResult.combine(
        ...adjectives
          .map((definition) => adjective(definition, 1, emphasis)),
      )
        .map((adjective) => ({
          type: "compound",
          conjunction: "and",
          adjective,
          emphasis: false,
        }));
    } else {
      throw new UntranslatableError(
        "reduplication",
        "compound adjective",
      );
    }
  });
}
export function rankAdjective(kind: Dictionary.AdjectiveType): number {
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
  adjective: Array<English.AdjectivePhrase>,
): Array<English.AdjectivePhrase> {
  return adjective
    .flatMap<English.AdjectivePhrase & { type: "simple" }>((adjective) => {
      switch (adjective.type) {
        case "simple":
          return [adjective];
        case "compound":
          return adjective.adjective as Array<
            English.AdjectivePhrase & { type: "simple" }
          >;
      }
    })
    .sort((a, b) => rankAdjective(a.kind) - rankAdjective(b.kind));
}
