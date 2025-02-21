import { distinct } from "@std/collections/distinct";
import { shuffle } from "@std/random/shuffle";
import { errors } from "../telo-misikeke/telo-misikeke.js";
import { ArrayResultError } from "./array-result.ts";
import { settings } from "./settings.ts";
import { translate as rawTranslate } from "./translator/composer.ts";

export { ArrayResultError } from "./array-result.ts";
export type { ArrayResultOptions } from "./array-result.ts";
export { loadCustomDictionary } from "./dictionary.ts";
export { defaultSettings, settings } from "./settings.ts";
export type { RedundancySettings, Settings } from "./settings.ts";

/** Translates Toki Pona text into multiple English translations. */
export function translate(tokiPona: string): Array<string> {
  const arrayResult = rawTranslate(tokiPona);
  if (!arrayResult.isError()) {
    const values = distinct(arrayResult.array);
    if (settings.randomize) {
      return shuffle(values);
    } else {
      return values;
    }
  } else {
    let error: ReadonlyArray<ArrayResultError> = [];
    if (settings.teloMisikeke) {
      error = errors(tokiPona)
        .map((message) => new ArrayResultError(message, { isHtml: true }));
    }
    if (error.length == 0) {
      error = arrayResult.deduplicateErrors().errors;
    }
    throw new AggregateError(error);
  }
}
