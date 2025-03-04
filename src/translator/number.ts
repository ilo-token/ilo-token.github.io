import { sumOf } from "@std/collections/sum-of";
import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import { nullableAsArray } from "../misc.ts";
import { FilteredOutError } from "./error.ts";

function singleNumber(word: string): ArrayResult<number> {
  return new ArrayResult(dictionary.get(word)!.definitions)
    .filterMap((definition) => {
      if (definition.type === "numeral") {
        return definition.numeral;
      } else {
        return null;
      }
    });
}
function regularNumber(number: ReadonlyArray<number>): number {
  const duplicate = number.some((a, i) =>
    i < number.length - 1 && number[i + 1] !== a &&
    number.slice(i + 2).some((b) => a === b)
  );
  if (duplicate) {
    throw new FilteredOutError("separate repeated numeral");
  } else {
    return sumOf(number, (number) => number);
  }
}
function subHundred(number: ReadonlyArray<number>): number {
  const total = regularNumber(number);
  if (total >= 100) {
    throw new FilteredOutError('"ale" position exceeding 99');
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
      let hundredCount = number
        .slice(aleStart)
        .findIndex((number) => number !== 100);
      if (hundredCount === -1) {
        hundredCount = number.length - aleStart;
      }
      if (previousHundredCount <= hundredCount) {
        throw new FilteredOutError('unsorted "ale"');
      }
      return subHundred(number.slice(0, aleStart)) * 100 ** hundredCount +
        unfilteredNasinNanpaPona(
          number.slice(aleStart + hundredCount),
          hundredCount,
        );
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
  return ArrayResult.from(() => {
    if (numbers.length !== 1 && numbers.includes(0)) {
      throw new FilteredOutError('"ala" along with other numeral');
    }
    return ArrayResult.concat(
      ArrayResult.from(() =>
        new ArrayResult(nullableAsArray(nasinNanpaPona(numbers)))
      ),
      ArrayResult.from(() => new ArrayResult([regularNumber(numbers)])),
    );
  });
}
export function number(number: ReadonlyArray<string>): ArrayResult<number> {
  return ArrayResult.combine(...number.map(singleNumber))
    .flatMap(combineNumbers);
}
