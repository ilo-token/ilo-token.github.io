import { sumOf } from "@std/collections/sum-of";
import { nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary.ts";
import { FilteredError } from "./error.ts";

function singleNumber(word: string) {
  return IterableResult.fromArray(dictionary.get(word)!.definitions)
    .filterMap((definition) =>
      definition.type === "numeral" ? definition.numeral : null
    );
}
function regularNumber(number: ReadonlyArray<number>) {
  const duplicate = number.some((a, i) =>
    i < number.length - 1 && number[i + 1] !== a &&
    number.slice(i + 2).some((b) => a === b)
  );
  if (duplicate) {
    throw new FilteredError("separate repeated numeral");
  } else {
    return sumOf(number, (number) => number);
  }
}
function subHundred(number: ReadonlyArray<number>) {
  const total = regularNumber(number);
  if (total >= 100) {
    throw new FilteredError("nasin nanpa pona position exceeding 99");
  } else {
    return total;
  }
}
function unfilteredNasinNanpaPona(
  number: ReadonlyArray<number>,
  previousHundredCount: number,
): number {
  if (number.length === 0) {
    return 0;
  } else {
    const aleStart = number.indexOf(100);
    if (aleStart === -1) {
      return subHundred(number);
    } else {
      const index = number
        .slice(aleStart)
        .findIndex((number) => number !== 100);
      const hundredCount = index !== -1 ? index : number.length - aleStart;
      if (previousHundredCount <= hundredCount) {
        throw new FilteredError('unsorted "ale"');
      } else {
        return subHundred(number.slice(0, aleStart)) * 100 ** hundredCount +
          unfilteredNasinNanpaPona(
            number.slice(aleStart + hundredCount),
            hundredCount,
          );
      }
    }
  }
}
function nasinNanpaPona(number: ReadonlyArray<number>) {
  if (number.includes(0) || !number.includes(100) || number[0] === 100) {
    return null;
  } else {
    return unfilteredNasinNanpaPona(number, Infinity);
  }
}
function combineNumbers(numbers: ReadonlyArray<number>) {
  if (numbers.length === 1 || !numbers.includes(0)) {
    return IterableResult.concat(
      IterableResult.from(() =>
        IterableResult.fromArray(nullableAsArray(nasinNanpaPona(numbers)))
      ),
      IterableResult.from(() => IterableResult.single(regularNumber(numbers))),
    );
  } else {
    return IterableResult.errors([
      new FilteredError('"ala" along with other numeral'),
    ]);
  }
}
export function number(number: ReadonlyArray<string>): IterableResult<number> {
  return IterableResult.combine(...number.map(singleNumber))
    .flatMap(combineNumbers);
}
