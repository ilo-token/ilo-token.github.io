import { IterableResult } from "../compound.ts";
import * as Dictionary from "../dictionary/type.ts";
import { nullableAsArray } from "../misc.ts";
import { settings } from "../settings.ts";
import * as UnresolvedEnglish from "../translator/ast.ts";
import { FilteredError } from "../translator/error.ts";
import { condense } from "../translator_legacy/misc.ts";
import * as ResolvedEnglish from "./ast.ts";

type Place = "subject" | "object";

type NounQuantity = Readonly<{
  noun: string;
  quantity: ResolvedEnglish.Quantity;
}>;
function fromNounForms(
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
function simpleNounForms(
  nounForms: Dictionary.NounForms,
): IterableResult<string> {
  return fromNounForms(nounForms, "both").map(({ noun }) => noun);
}
function pronounForms(
  pronoun: Dictionary.PronounForms,
  place: Place,
): Dictionary.NounForms {
  switch (place) {
    case "subject":
      return {
        singular: pronoun.singular?.subject ?? null,
        plural: pronoun.plural?.subject ?? null,
      };
    case "object":
      return {
        singular: pronoun.singular?.object ?? null,
        plural: pronoun.plural?.object ?? null,
      };
  }
}
function check(
  quantities: ReadonlyArray<Dictionary.Quantity>,
  some: Dictionary.Quantity,
  not: Dictionary.Quantity,
) {
  return quantities.some((quantity) => quantity === some) &&
    quantities.every((quantity) => quantity !== not);
}
function getNumber(
  determiners: ReadonlyArray<UnresolvedEnglish.Determiner>,
): Dictionary.Quantity {
  const quantities = determiners.map(({ quantity }) => quantity);
  if (quantities.every((quantity) => quantity === "both")) {
    return "both";
  } else if (check(quantities, "singular", "plural")) {
    return "singular";
  } else if (check(quantities, "plural", "singular")) {
    return "plural";
  } else {
    // TODO: better error message
    throw new FilteredError(
      "chain of determiner including singular and plural",
    );
  }
}
function resolveDeterminer(
  determiner: UnresolvedEnglish.Determiner,
): IterableResult<ResolvedEnglish.Determiner> {
  return simpleNounForms({
    singular: determiner.determiner,
    plural: determiner.plural,
  })
    .map((word) => ({
      ...determiner,
      determiner: { word, emphasis: determiner.emphasis },
    }));
}
function resolveNoun(
  noun: UnresolvedEnglish.NounPhrase,
  place: Place,
): IterableResult<ResolvedEnglish.NounPhrase> {
  switch (noun.type) {
    case "simple": {
      const number = getNumber(noun.determiners);
      return IterableResult.combine(
        fromNounForms(pronounForms(noun, place), number),
        IterableResult.combine(...noun.determiners.map(resolveDeterminer)),
        IterableResult.fromNullable(noun.postCompound)
          .flatMap((noun) => resolveNoun(noun, place)),
        IterableResult.combine(...noun.prepositions.map(resolvePreposition)),
      )
        .map((
          [{ noun: word, quantity }, determiners, postCompound, prepositions],
        ) => ({
          ...noun,
          determiners,
          noun: { word, emphasis: noun.wordEmphasis },
          quantity,
          emphasis: noun.phraseEmphasis,
          postCompound,
          prepositions,
        }));
    }
    case "compound":
      return IterableResult.combine(
        ...noun.nouns.map((noun) => resolveNoun(noun, place)),
      )
        .map((nouns) => ({ ...noun, nouns }));
  }
}
function resolveComplement(
  complement: UnresolvedEnglish.Complement,
): IterableResult<ResolvedEnglish.Complement> {
  switch (complement.type) {
    case "noun":
      return resolveNoun(complement.noun, "object")
        .map((noun) => ({ type: "noun", noun }));
    case "adjective":
      return IterableResult.single(complement);
  }
}
function resolvePreposition(
  preposition: UnresolvedEnglish.Preposition,
): IterableResult<ResolvedEnglish.Preposition> {
  return resolveNoun(preposition.object, "object")
    .map((object) => ({ ...preposition, object }));
}
