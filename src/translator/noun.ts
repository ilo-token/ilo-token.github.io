import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { settings } from "../settings.ts";
import { adjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { determiner, extractNegativeFromDeterminers } from "./determiner.ts";
import { condense } from "./misc.ts";
import { word } from "./word.ts";

export type PartialNoun =
  & Dictionary.NounForms
  & Readonly<{
    determiner: ReadonlyArray<English.Determiner>;
    adjective: ReadonlyArray<English.AdjectivePhrase>;
    reduplicationCount: number;
    emphasis: boolean;
    perspective: Dictionary.Perspective;
    postAdjective: null | { adjective: string; name: string };
  }>;
export function partialNoun(
  options: Readonly<{
    definition: Dictionary.Noun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<PartialNoun> {
  const { definition } = options;
  const engDeterminer = IterableResult.combine(
    ...definition.determiner
      .map((definition) =>
        determiner({ definition, reduplicationCount: 1, emphasis: false })
      ),
  );
  const engAdjective = IterableResult.combine(
    ...definition.adjective
      .map((definition) =>
        adjective({ definition, reduplicationCount: 1, emphasis: null })
      ),
  );
  return IterableResult.combine(engDeterminer, engAdjective)
    .map(([determiner, adjective]) => ({
      ...options,
      ...definition,
      determiner,
      adjective,
      perspective: "third",
    }));
}
export function fromNounForms(
  nounForms: Dictionary.NounForms,
  determinerNumber: Dictionary.Quantity,
): IterableResult<{ noun: string; quantity: English.Quantity }> {
  const { singular, plural } = nounForms;
  switch (determinerNumber) {
    case "singular":
    case "plural": {
      let noun: null | string;
      switch (determinerNumber) {
        case "singular":
          noun = singular;
          break;
        case "plural":
          noun = plural;
          break;
      }
      return IterableResult.fromArray(nullableAsArray(noun))
        .map((noun) => ({ noun, quantity: determinerNumber }));
    }
    case "both":
      switch (settings.quantity) {
        case "both":
          return IterableResult.fromArray([
            ...nullableAsArray(singular)
              .map((noun) => ({ noun, quantity: "singular" as const })),
            ...nullableAsArray(plural)
              .map((noun) => ({ noun, quantity: "plural" as const })),
          ]);
        case "condensed":
          if (singular != null && plural != null) {
            return IterableResult.single({
              noun: condense(singular, plural),
              quantity: "condensed",
            });
          }
          // fallthrough
        case "default only":
          if (singular != null) {
            return IterableResult.single({
              noun: singular,
              quantity: "singular",
            });
          } else {
            return IterableResult.single({ noun: plural!, quantity: "plural" });
          }
      }
  }
}
export function simpleNounForms(
  nounForms: Dictionary.NounForms,
): IterableResult<string> {
  return fromNounForms(nounForms, "both").map(({ noun }) => noun);
}
export function noun(
  options: Readonly<{
    definition: Dictionary.Noun;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<English.NounPhrase> {
  const { definition } = options;
  return IterableResult.combine(
    fromNounForms(definition, "both"),
    partialNoun(options),
  )
    .map(([{ noun, quantity }, partialNoun]) => ({
      ...partialNoun,
      type: "simple",
      noun: word({ ...options, word: noun }),
      postCompound: null,
      quantity,
      preposition: [],
      emphasis: false,
    }));
}
export function perspective(noun: English.NounPhrase): Dictionary.Perspective {
  switch (noun.type) {
    case "simple":
      return noun.perspective;
    case "compound":
      return "third";
  }
}
export function extractNegativeFromNoun(
  noun: English.NounPhrase,
): null | English.NounPhrase {
  switch (noun.type) {
    case "simple":
      return mapNullable(
        extractNegativeFromDeterminers(noun.determiner),
        (determiner) => ({ ...noun, determiner }),
      );
    case "compound": {
      const nouns = noun.nouns.map(extractNegativeFromNoun);
      if (nouns.every((noun) => noun != null)) {
        return { ...noun, nouns };
      } else {
        return null;
      }
    }
  }
}
