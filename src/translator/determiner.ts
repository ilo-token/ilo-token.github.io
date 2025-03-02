import { zip } from "@std/collections/zip";
import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array-result.ts";
import { filterSet } from "../misc.ts";
import * as English from "./ast.ts";
import { FilteredOutError } from "./error.ts";
import { simpleNounForms } from "./noun.ts";
import { word } from "./word.ts";

function prettyPrintDeterminers(
  determiners: Array<English.Determiner>,
): string {
  return `(${
    determiners.map((determiner) => determiner.determiner).join(` `)
  })`;
}
function filterKind(
  determiners: Array<English.Determiner>,
  kinds: Array<Dictionary.DeterminerType>,
): Array<English.Determiner> {
  return determiners.filter((determiner) => kinds.includes(determiner.kind));
}
function filterQuantity(
  determiners: Array<English.Determiner>,
  quantity: Dictionary.Quantity,
): Array<English.Determiner> {
  return determiners.filter((determiner) => determiner.quantity === quantity);
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
  if (quantities.every((quantity) => quantity === `both`)) {
    return "both";
  } else if (check(quantities, "singular", "plural")) {
    return "singular";
  } else if (check(quantities, "plural", "singular")) {
    return "plural";
  } else {
    const singular = prettyPrintDeterminers(
      filterQuantity(determiners, "singular"),
    );
    const plural = prettyPrintDeterminers(
      filterQuantity(determiners, "plural"),
    );
    throw new FilteredOutError(
      `determiner for singular nouns ${singular} with determiner for plural nouns ${plural}`,
    );
  }
}
export function determiner(
  definition: Dictionary.Determiner,
  reduplicationCount: number,
  emphasis: boolean,
): ArrayResult<English.Determiner> {
  return simpleNounForms({
    singular: definition.determiner,
    plural: definition.plural,
  })
    .map((determiner) => ({
      kind: definition.kind,
      determiner: word(determiner, reduplicationCount, emphasis),
      quantity: definition.quantity,
    }));
}
export function fixDeterminer(
  determiner: Array<English.Determiner>,
): Array<English.Determiner> {
  const negative = filterKind(determiner, [`negative`]);
  const first = filterKind(determiner, [
    `article`,
    `demonstrative`,
    `possessive`,
  ]);
  const article = filterKind(determiner, [`article`]);
  const demonstrative = filterKind(determiner, [`demonstrative`]);
  const possessive = filterKind(determiner, [`possessive`]);
  const distributive = filterKind(determiner, [`distributive`]);
  const interrogative = filterKind(determiner, [`interrogative`]);
  const quantitative = filterKind(determiner, [`numeral`, `quantifier`]);
  const errors = filterSet([
    [
      negative.length > 1,
      encodeDeterminer`multiple negative determiners ${negative}`,
    ],
    [article.length > 1, encodeDeterminer`multiple articles ${article}`],
    [
      demonstrative.length > 1,
      encodeDeterminer`multiple demonstrative determiners ${demonstrative}`,
    ],
    [
      possessive.length > 1,
      encodeDeterminer`multiple possessive determiners ${possessive}`,
    ],
    [
      distributive.length > 1,
      encodeDeterminer`multiple distributive determiners ${distributive}`,
    ],
    [
      interrogative.length > 1,
      encodeDeterminer`multiple interrogative determiners ${interrogative}`,
    ],
    [
      quantitative.length > 1,
      encodeDeterminer`multiple quantitative determiners ${quantitative}`,
    ],
    [
      article.length > 0 && demonstrative.length > 0,
      encodeDeterminer`article ${article} with demonstrative determiner ${demonstrative}`,
    ],
    [
      article.length > 0 && possessive.length > 0,
      encodeDeterminer`article ${article} with possessive determiner ${possessive}`,
    ],
    [
      demonstrative.length > 0 && possessive.length > 0,
      encodeDeterminer`demonstrative determiner ${demonstrative} with possessive determiner ${possessive}`,
    ],
    [
      negative.length > 0 && interrogative.length > 0,
      encodeDeterminer`negative determiner ${negative} with interrogative determiner ${interrogative}`,
    ],
  ]);
  if (errors.length === 0) {
    return [
      ...negative,
      ...first,
      ...distributive,
      ...interrogative,
      ...quantitative,
    ];
  } else {
    throw new AggregateError(
      errors.map((element) => new FilteredOutError(element())),
    );
  }
}
function encodeDeterminer(
  strings: TemplateStringsArray,
  ...determiners: Array<Array<English.Determiner>>
): () => string {
  return () =>
    zip(strings, [...determiners.map(prettyPrintDeterminers), ""])
      .flat()
      .join("");
}
