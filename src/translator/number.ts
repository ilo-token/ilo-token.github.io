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
function regularNumber(numbers: ReadonlyArray<number>) {
  const duplicate = numbers.some((a, i) =>
    i < numbers.length - 1 && numbers[i + 1] !== a &&
    numbers.slice(i + 2).some((b) => a === b)
  );
  if (duplicate) {
    throw new FilteredError("separate repeated numeral");
  } else {
    return sumOf(numbers, (number) => number);
  }
}
function subHundred(numbers: ReadonlyArray<number>) {
  const total = regularNumber(numbers);
  if (total >= 100) {
    throw new FilteredError("nasin nanpa pona position exceeding 99");
  } else {
    return total;
  }
}
function unfilteredNasinNanpaPona(
  numbers: ReadonlyArray<number>,
  previousHundredCount: number,
): number {
  if (numbers.length === 0) {
    return 0;
  } else {
    const aleStart = numbers.indexOf(100);
    if (aleStart === -1) {
      return subHundred(numbers);
    } else {
      const index = numbers
        .slice(aleStart)
        .findIndex((number) => number !== 100);
      const hundredCount = index !== -1 ? index : numbers.length - aleStart;
      if (previousHundredCount <= hundredCount) {
        throw new FilteredError('unsorted "ale"');
      } else {
        return subHundred(numbers.slice(0, aleStart)) * 100 ** hundredCount +
          unfilteredNasinNanpaPona(
            numbers.slice(aleStart + hundredCount),
            hundredCount,
          );
      }
    }
  }
}
function nasinNanpaPona(numbers: ReadonlyArray<number>) {
  if (numbers.includes(0) || !numbers.includes(100) || numbers[0] === 100) {
    return null;
  } else {
    return unfilteredNasinNanpaPona(numbers, Infinity);
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
export function number(numbers: ReadonlyArray<string>): IterableResult<number> {
  return IterableResult.combine(...numbers.map(singleNumber))
    .flatMap(combineNumbers);
}
