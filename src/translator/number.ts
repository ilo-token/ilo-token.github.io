import { sumOf } from "@std/collections/sum-of";
import { nullableAsArray } from "../../misc/misc.ts";
import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import { FilteredError } from "./error.ts";

function singleNumber(word: string): ArrayResult<number> {
  return new ArrayResult(dictionary.get(word)!.definitions)
    .filterMap((definition) =>
      definition.type === "numeral" ? definition.numeral : null
    );
}
function regularNumber(number: ReadonlyArray<number>): number {
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
function subHundred(number: ReadonlyArray<number>): number {
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
function nasinNanpaPona(number: ReadonlyArray<number>): null | number {
  if (number.includes(0) || !number.includes(100) || number[0] === 100) {
    return null;
  } else {
    return unfilteredNasinNanpaPona(number, Infinity);
  }
}
function combineNumbers(numbers: ReadonlyArray<number>): ArrayResult<number> {
  if (numbers.length === 1 || !numbers.includes(0)) {
    return ArrayResult.concat(
      ArrayResult.from(() =>
        new ArrayResult(nullableAsArray(nasinNanpaPona(numbers)))
      ),
      ArrayResult.from(() => new ArrayResult([regularNumber(numbers)])),
    );
  } else {
    return new ArrayResult(new FilteredError('"ala" along with other numeral'));
  }
}
export function number(number: ReadonlyArray<string>): ArrayResult<number> {
  return ArrayResult.combine(...number.map(singleNumber))
    .flatMap(combineNumbers);
}
