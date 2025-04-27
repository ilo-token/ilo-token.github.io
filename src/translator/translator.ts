import { errors } from "../../telo_misikeke/telo_misikeke.js";
import { IterableResult, ResultError } from "../compound.ts";
import { parser } from "../parser/parser.ts";
import { settings } from "../settings.ts";
import * as EnglishComposer from "./composer.ts";
import { multipleSentences } from "./sentence.ts";

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
