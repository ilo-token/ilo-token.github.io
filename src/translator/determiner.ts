import * as English from "./ast.ts";
import { repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as Dictionary from "../../dictionary/type.ts";
import { simpleNounForms } from "./noun.ts";

export function findNumber(
  determiner: Array<English.Determiner>,
): null | Dictionary.Quantity {
  const quantity = determiner.map((determiner) => determiner.number);
  if (quantity.every((quantity) => quantity === "both")) {
    return "both";
  } else if (
    quantity.every((quantity) => quantity !== "plural") &&
    quantity.some((quantity) => quantity === "singular")
  ) {
    return "singular";
  } else if (
    quantity.every((quantity) => quantity !== "singular") &&
    quantity.some((quantity) => quantity === "plural")
  ) {
    return "plural";
  } else {
    return null;
  }
}
export function determiner(
  definition: Dictionary.Determiner,
  emphasis: boolean,
  count: number,
): Output<English.Determiner> {
  return simpleNounForms(definition.determiner, definition.plural)
    .map((determiner) => ({
      kind: definition.kind,
      determiner: {
        word: repeatWithSpace(determiner, count),
        emphasis,
      },
      number: definition.number,
    }));
}
function filterDeterminer(
  determiners: Array<English.Determiner>,
  kinds: Array<Dictionary.DeterminerType>,
): Array<English.Determiner> {
  return determiners.filter((determiner) => kinds.includes(determiner.kind));
}
export function fixDeterminer(
  determiner: Array<English.Determiner>,
): null | Array<English.Determiner> {
  const negative = filterDeterminer(determiner, ["negative"]);
  const first = filterDeterminer(determiner, [
    "article",
    "demonstrative",
    "possessive",
  ]);
  const distributive = filterDeterminer(determiner, ["distributive"]);
  const interrogative = filterDeterminer(determiner, ["interrogative"]);
  const numerical = filterDeterminer(determiner, ["numeral", "quantifier"]);
  if (
    negative.length > 1 || first.length > 1 || distributive.length > 1 ||
    interrogative.length > 1 || numerical.length > 1 ||
    (negative.length > 0 && interrogative.length > 0)
  ) {
    return null;
  } else {
    return [
      ...negative,
      ...first,
      ...distributive,
      ...interrogative,
      ...numerical,
    ];
  }
}
