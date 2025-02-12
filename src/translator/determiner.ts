import * as English from "./ast.ts";
import { repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import * as Dictionary from "../../dictionary/type.ts";
import { simpleNounForms } from "./noun.ts";
import { OutputError } from "../mod.ts";

function getWord(
  determiner: Array<English.Determiner>,
  quantity: Dictionary.Quantity,
): string {
  return determiner
    .filter((determiner) => determiner.quantity === quantity)[0]
    .determiner
    .word;
}
function check(
  quantities: Array<Dictionary.Quantity>,
  some: Dictionary.Quantity,
  not: Dictionary.Quantity,
): boolean {
  return quantities.some((quantity) => quantity === some) &&
    quantities.every((quantity) => quantity !== not);
}
export function findNumber(
  determiners: Array<English.Determiner>,
): Dictionary.Quantity {
  const quantities = determiners.map((determiner) => determiner.quantity);
  if (quantities.every((quantity) => quantity === "both")) {
    return "both";
  } else if (check(quantities, "singular", "plural")) {
    return "singular";
  } else if (check(quantities, "plural", "singular")) {
    return "plural";
  } else {
    const singular = getWord(determiners, "singular");
    const plural = getWord(determiners, "singular");
    throw new OutputError(
      `conflicting set of determiners, ${singular} is for singular nouns but ${plural} is for plural`,
    );
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
      quantity: definition.quantity,
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
): Array<English.Determiner> {
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
    // TODO: encode why
    throw new OutputError("conflicting set of determiners");
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
