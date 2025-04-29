import { zip } from "@std/collections/zip";
import * as Dictionary from "../../dictionary/type.ts";
import { IterableResult } from "../compound.ts";
import * as English from "./ast.ts";
import { FilteredError } from "./error.ts";
import { simpleNounForms } from "./noun.ts";
import { word } from "./word.ts";

function filterKind(
  determiners: ReadonlyArray<English.Determiner>,
  kinds: ReadonlyArray<Dictionary.DeterminerType>,
) {
  return determiners.filter(({ kind }) => kinds.includes(kind));
}
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
    .map((determiner) => ({
      ...definition,
      determiner: word({ ...options, word: determiner }),
    }));
}
export function fixDeterminer(
  determiner: ReadonlyArray<English.Determiner>,
): ReadonlyArray<English.Determiner> {
  const negative = filterKind(determiner, ["negative"]);
  const first = filterKind(determiner, [
    "article",
    "demonstrative",
    "possessive",
  ]);
  const article = filterKind(determiner, ["article"]);
  const demonstrative = filterKind(determiner, ["demonstrative"]);
  const possessive = filterKind(determiner, ["possessive"]);
  const distributive = filterKind(determiner, ["distributive"]);
  const interrogative = filterKind(determiner, ["interrogative"]);
  const quantitative = filterKind(determiner, ["numeral", "quantifier"]);
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
      errors.map((element) => new FilteredError(element())),
    );
  }
}
export function extractNegativeFromDeterminers(
  determiner: ReadonlyArray<English.Determiner>,
): null | ReadonlyArray<English.Determiner> {
  const index = determiner.findIndex(({ kind }) => kind === "negative");
  if (index === -1) {
    return null;
  } else {
    return [...determiner].splice(index, 1);
  }
}
function encodeDeterminer(
  strings: TemplateStringsArray,
  ...determiners: ReadonlyArray<ReadonlyArray<English.Determiner>>
) {
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
function filterSet<const T>(
  set: ReadonlyArray<readonly [condition: boolean, value: T]>,
) {
  return set.filter(([condition]) => condition).map(([_, value]) => value);
}
