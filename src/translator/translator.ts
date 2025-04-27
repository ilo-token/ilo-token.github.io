import { distinct } from "@std/collections/distinct";
import { distinctBy } from "@std/collections/distinct-by";
import { shuffle } from "@std/random/shuffle";
import { errors } from "../../telo_misikeke/telo_misikeke.js";
import { ArrayResult, ResultError } from "../compound.ts";
import { parser } from "../parser/parser.ts";
import { settings } from "../settings.ts";
import * as EnglishComposer from "./composer.ts";
import { multipleSentences } from "./sentence.ts";

export function translate(tokiPona: string): ArrayResult<string> {
  const arrayResult = parser
    .parse(tokiPona)
    .flatMap(multipleSentences)
    .map(EnglishComposer.multipleSentences);
  if (!arrayResult.isError()) {
    const values = distinct(arrayResult.unwrap());
    if (settings.randomize) {
      return new ArrayResult(shuffle(values));
    } else {
      return new ArrayResult(values);
    }
  } else {
    const teloMisikekeErrors = settings.teloMisikeke
      ? errors(tokiPona)
        .map((message) => new ResultError(message, { isHtml: true }))
      : [];
    const error = teloMisikekeErrors.length === 0
      ? deduplicateErrors(arrayResult.errors)
      : teloMisikekeErrors;
    return ArrayResult.errors(error);
  }
}
function deduplicateErrors<const T extends Error>(errors: Iterable<T>) {
  return distinctBy(errors, ({ message }) => message);
}
