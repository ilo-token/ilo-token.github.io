import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as Dictionary from "../../dictionary/type.ts";
import { unemphasized } from "./misc.ts";

function so(emphasis: null | TokiPona.Emphasis): null | string {
  if (emphasis == null) {
    return null;
  } else {
    switch (emphasis.type) {
      case "word":
        return "so";
      case "long word":
        return `s${"o".repeat(emphasis.length)}`;
      case "multiple a":
        return null;
    }
  }
}
export function adjective(
  definition: Dictionary.Adjective,
  emphasis: null | TokiPona.Emphasis,
  reduplicationCount: number,
): Output<English.AdjectivePhrase & { type: "simple" }> {
  return new Output([
    ...nullableAsArray(so(emphasis)).map((so) => ({ emphasis: false, so })),
    { emphasis: emphasis != null, so: null },
  ])
    .map(({ emphasis, so }) => ({
      type: "simple",
      kind: definition.kind,
      adverb: [...definition.adverb, ...nullableAsArray(so)].map(unemphasized),
      adjective: {
        word: repeatWithSpace(definition.adjective, reduplicationCount),
        emphasis,
      },
      emphasis: false,
    }));
}
export function compoundAdjective(
  definition: Dictionary.Definition & { type: "compound adjective" },
  emphasis: null | TokiPona.Emphasis,
): Output<English.AdjectivePhrase & { type: "compound" }> {
  return Output.combine(
    ...definition.adjective
      .map((definition) => adjective(definition, emphasis, 1)),
  )
    .map((adjective) => ({
      type: "compound",
      conjunction: "and",
      adjective,
      emphasis: false,
    }));
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
