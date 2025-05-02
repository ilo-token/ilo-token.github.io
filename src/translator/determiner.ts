import { zip } from "@std/collections/zip";
import * as Dictionary from "../../dictionary/type.ts";
import { IterableResult } from "../compound.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { simpleNounForms } from "./noun.ts";
import { word } from "./word.ts";

function filterQuantity(
  determiners: ReadonlyArray<English.Determiner>,
  targetQuantity: Dictionary.Quantity,
) {
  return determiners.filter(({ quantity }) => quantity === targetQuantity);
}
function check(
  quantities: ReadonlyArray<Dictionary.Quantity>,
  some: Dictionary.Quantity,
  not: Dictionary.Quantity,
) {
  return quantities.some((quantity) => quantity === some) &&
    quantities.every((quantity) => quantity !== not);
}
export function getNumber(
  determiners: ReadonlyArray<English.Determiner>,
): Dictionary.Quantity {
  const quantities = determiners.map(({ quantity }) => quantity);
  if (quantities.every((quantity) => quantity === "both")) {
    return "both";
  } else if (check(quantities, "singular", "plural")) {
    return "singular";
  } else if (check(quantities, "plural", "singular")) {
    return "plural";
  } else {
    const singular = filterQuantity(determiners, "singular");
    const plural = filterQuantity(determiners, "plural");
    throw new FilteredError(
      encodeDeterminer`determiner for singular nouns ${singular} with determiner for plural nouns ${plural}`(),
    );
  }
}
export function determiner(
  options: Readonly<{
    definition: Dictionary.Determiner;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): IterableResult<English.Determiner> {
  const { definition } = options;
  return simpleNounForms({
    singular: definition.determiner,
    plural: definition.plural,
  })
    .map((determiner): English.Determiner => ({
      ...definition,
      determiner: word({ ...options, word: determiner }),
    }));
}
export function extractNegativeFromMultipleDeterminers(
  determiners: ReadonlyArray<English.Determiner>,
): null | ReadonlyArray<English.Determiner> {
  const index = determiners.findIndex(({ kind }) => kind === "negative");
  if (index === -1) {
    return null;
  } else {
    const spliced = [...determiners];
    spliced.splice(index, 1);
    return spliced;
  }
}
export function encodeDeterminer(
  strings: TemplateStringsArray,
  ...determiners: ReadonlyArray<ReadonlyArray<English.Determiner>>
): () => string {
  return () =>
    zip(strings, [
      ...determiners
        .map((determiners) =>
          `(${determiners.map(({ determiner }) => determiner).join(" ")})`
        ),
      "",
    ])
      .flat()
      .join("");
}
