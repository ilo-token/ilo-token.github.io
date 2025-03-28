import { distinct } from "@std/collections/distinct";
import { shuffle } from "@std/random/shuffle";
import { deduplicateErrors } from "../misc/deduplicate_errors.ts";
import { errors } from "../telo_misikeke/telo_misikeke.js";
import { ArrayResultError } from "./array_result.ts";
import { settings } from "./settings.ts";
import { translate as rawTranslate } from "./translator/translator.ts";

export { ArrayResultError, type ArrayResultOptions } from "./array_result.ts";
export { loadCustomDictionary } from "./dictionary.ts";
export { clearCache } from "./parser/cache.ts";
export {
  defaultSettings,
  type RedundancySettings,
  type Settings,
  settings,
} from "./settings.ts";

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
    const teloMisikekeErrors = settings.teloMisikeke
      ? errors(tokiPona)
        .map((message) => new ArrayResultError(message, { isHtml: true }))
      : [];
    const error = teloMisikekeErrors.length === 0
      ? deduplicateErrors(arrayResult.errors)
      : teloMisikekeErrors;
    throw new AggregateError(error);
  }
}
