import { distinct } from "@std/collections/distinct";
import { shuffle } from "@std/random/shuffle";
import { errors } from "../telo-misikeke/telo_misikeke.js";
import { ArrayResultError } from "./array_result.ts";
import { deduplicateErrors } from "./misc.ts";
import { settings } from "./settings.ts";
import { translate as rawTranslate } from "./translator/translator.ts";

export { ArrayResultError } from "./array_result.ts";
export type { ArrayResultOptions } from "./array_result.ts";
export { loadCustomDictionary } from "./dictionary.ts";
export { clearCache } from "./parser/cache.ts";
export { defaultSettings, settings } from "./settings.ts";
export type { RedundancySettings, Settings } from "./settings.ts";

export function translate(tokiPona: string): ReadonlyArray<string> {
  const arrayResult = rawTranslate(tokiPona);
  if (!arrayResult.isError()) {
    const values = distinct(arrayResult.array);
    if (settings.randomize) {
      return shuffle(values);
    } else {
      return values;
    }
  } else {
    let teloMisikekeErrors: ReadonlyArray<ArrayResultError>;
    if (settings.teloMisikeke) {
      teloMisikekeErrors = errors(tokiPona)
        .map((message) => new ArrayResultError(message, { isHtml: true }));
    } else {
      teloMisikekeErrors = [];
    }
    let error: ReadonlyArray<ArrayResultError>;
    if (teloMisikekeErrors.length === 0) {
      error = deduplicateErrors(arrayResult.errors);
    } else {
      error = teloMisikekeErrors;
    }
    throw new AggregateError(error);
  }
}
