import { IterableResult } from "../compound.ts";
import * as Dictionary from "../dictionary/type.ts";
import { mapNullable, nullableAsArray } from "../misc.ts";
import * as English from "../resolver_and_composer/ast.ts";
import { settings } from "../settings.ts";
import { word } from "../translator/word.ts";
import { adjective } from "./adjective.ts";
import {
  determiner,
  extractNegativeFromMultipleDeterminers,
} from "./determiner.ts";
import { condense } from "./misc.ts";

export type PartialNoun =
  & Dictionary.NounForms
  & Readonly<{
    determiners: ReadonlyArray<English.Determiner>;
    adjectives: ReadonlyArray<English.AdjectivePhrase>;
    reduplicationCount: number;
    emphasis: boolean;
    perspective: Dictionary.Perspective;
    adjectiveName: null | { adjective: string; name: string };
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
    ...definition.determiners
      .map((definition) =>
        determiner({ definition, reduplicationCount: 1, emphasis: false })
      ),
  );
  const engAdjective = IterableResult.combine(
    ...definition.adjectives
      .map((definition) =>
        adjective({ definition, reduplicationCount: 1, emphasis: null })
      ),
  );
  return IterableResult.combine(engDeterminer, engAdjective)
    .map(([determiners, adjectives]): PartialNoun => ({
      ...options,
      ...definition,
      determiners,
      adjectives,
      perspective: "third",
    }));
}
type NounQuantity = Readonly<{ noun: string; quantity: English.Quantity }>;
export function fromNounForms(
  nounForms: Dictionary.NounForms,
  determinerNumber: Dictionary.Quantity,
): IterableResult<NounQuantity> {
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
      return IterableResult.fromNullable(noun)
        .map((noun): NounQuantity => ({ noun, quantity: determinerNumber }));
    }
    case "both":
      switch (settings.quantity) {
        case "both":
          return IterableResult.fromArray([
            ...nullableAsArray(singular)
              .map((noun): NounQuantity => ({ noun, quantity: "singular" })),
            ...nullableAsArray(plural)
              .map((noun): NounQuantity => ({ noun, quantity: "plural" })),
          ]);
        case "condensed":
          if (singular != null && plural != null) {
            return IterableResult.single<NounQuantity>({
              noun: condense(singular, plural),
              quantity: "condensed",
            });
          }
          // fallthrough
        case "default only":
          if (singular != null) {
            return IterableResult.single<NounQuantity>({
              noun: singular,
              quantity: "singular",
            });
          } else {
            return IterableResult.single<NounQuantity>({
              noun: plural!,
              quantity: "plural",
            });
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
    .map(([{ noun, quantity }, partialNoun]): English.NounPhrase => ({
      ...partialNoun,
      type: "simple",
      noun: word({ ...options, word: noun }),
      postCompound: null,
      quantity,
      prepositions: [],
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
export function quantity(noun: English.NounPhrase): English.Quantity {
  switch (noun.type) {
    case "simple":
      return noun.quantity;
    case "compound":
      switch (noun.conjunction as "and" | "or") {
        case "and":
          return "plural";
        case "or":
          return quantity(noun.nouns[noun.nouns.length - 1]);
      }
  }
}
export function extractNegativeFromNoun(
  noun: English.NounPhrase,
): null | English.NounPhrase {
  switch (noun.type) {
    case "simple":
      return mapNullable(
        extractNegativeFromMultipleDeterminers(noun.determiners),
        (determiners): English.NounPhrase => ({ ...noun, determiners }),
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
export function combineNoun(
  conjunction: string,
  phrases: ReadonlyArray<English.NounPhrase>,
): English.NounPhrase {
  const nouns = phrases
    .flatMap((noun) => {
      if (
        noun.type === "compound" &&
        noun.conjunction === conjunction
      ) {
        return noun.nouns;
      } else {
        return [noun];
      }
    });
  return {
    type: "compound",
    conjunction,
    nouns,
  };
}
