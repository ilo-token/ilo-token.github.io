import { shuffle } from "@std/random/shuffle";
import { errors } from "../../telo_misikeke/telo_misikeke.js";
import { IterableResult, ResultError } from "../compound.ts";
import { parser } from "../parser/parser.ts";
import { settings } from "../settings.ts";
import * as EnglishComposer from "./composer.ts";
import { multipleSentences } from "./sentence.ts";

const RANDOMIZATION_LIMIT = 10000;

export function translate(tokiPona: string): IterableResult<string> {
  return new IterableResult(function* () {
    const iterableResult = parser
      .parse(tokiPona)
      .asIterableResult()
      .flatMap(multipleSentences)
      .map(EnglishComposer.multipleSentences);
    let yielded = false;
    const aggregateErrors: Array<ResultError> = [];
    const unique: Set<string> = new Set();
    if (settings.randomize) {
      for (const result of iterableResult.iterable()) {
        if (unique.size >= RANDOMIZATION_LIMIT) {
          yield {
            type: "error",
            error: new ResultError("too many output to shuffle"),
          };
          return;
        }
        switch (result.type) {
          case "value":
            unique.add(result.value);
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
      for (const result of iterableResult.iterable()) {
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
      let yielded = false;
      if (settings.teloMisikeke) {
        for (const error of errors(tokiPona)) {
          yielded = true;
          yield {
            type: "error",
            error: new ResultError(error, { isHtml: true }),
          };
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
    }
  });
}
