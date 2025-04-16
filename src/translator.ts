import { distinct } from "@std/collections/distinct";
import { shuffle } from "@std/random/shuffle";
import { deduplicateErrors } from "../misc/deduplicate_errors.ts";
import { errors } from "../telo_misikeke/telo_misikeke.js";
import { ArrayResult, ArrayResultError } from "./array_result.ts";
import { settings } from "./settings.ts";
import { translate as rawTranslate } from "./translator/translator.ts";

export function translate(tokiPona: string): ArrayResult<string> {
  const arrayResult = rawTranslate(tokiPona);
  if (!arrayResult.isError()) {
    const values = distinct(arrayResult.array);
    if (settings.randomize) {
      return new ArrayResult(shuffle(values));
    } else {
      return new ArrayResult(values);
    }
  } else {
    const teloMisikekeErrors = settings.teloMisikeke
      ? errors(tokiPona)
        .map((message) => new ArrayResultError(message, { isHtml: true }))
      : [];
    const error = teloMisikekeErrors.length === 0
      ? deduplicateErrors(arrayResult.errors)
      : teloMisikekeErrors;
    return ArrayResult.errors(error);
  }
}
