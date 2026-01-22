import { randomIntegerBetween } from "@std/random/integer-between";
import { shuffle } from "@std/random/shuffle";
import { IterableResult, ResultError } from "../compound.ts";
import { parser } from "../parser/parser.ts";
import { settings } from "../settings.ts";
import * as EnglishComposer from "./composer.ts";
import { fixMultipleSentences } from "./fixer.ts";
import { multipleSentences } from "./sentence.ts";

const RANDOMIZATION_LIMIT = 20_000;

export function translate(tokiPona: string): IterableResult<string> {
  return new IterableResult([], function* () {
    const iterableResult = parser
      .parse(tokiPona)
      .flatMap(multipleSentences)
      .map(fixMultipleSentences)
      .map(EnglishComposer.multipleSentences);
    let yielded = false;
    const aggregateErrors: Array<ResultError> = [];
    const unique: Set<string> = new Set();
    if (settings.randomize) {
      for (const result of iterableResult) {
        switch (result.type) {
          case "value":
            unique.add(result.value);
            if (unique.size > RANDOMIZATION_LIMIT) {
              const sample = [...unique];
              const value = sample[randomIntegerBetween(0, sample.length)];
              unique.delete(value);
              yield { type: "value", value };
            }
            break;
          case "error":
            aggregateErrors.push(result.error);
            break;
        }
      }
      for (const value of shuffle([...unique])) {
        yielded = true;
        yield { type: "value", value };
      }
    } else {
      for (const result of iterableResult) {
        switch (result.type) {
          case "value":
            if (!unique.has(result.value)) {
              yielded = true;
              yield result;
              unique.add(result.value);
            }
            break;
          case "error":
            aggregateErrors.push(result.error);
            break;
        }
      }
    }
    if (!yielded) {
      const unique: Set<string> = new Set();
      for (const error of aggregateErrors) {
        if (!unique.has(error.message)) {
          yield { type: "error", error };
          unique.add(error.message);
        }
      }
    }
  });
}
