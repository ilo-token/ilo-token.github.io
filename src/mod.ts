import { errors } from "../telo-misikeke/telo-misikeke.js";
import { translate as rawTranslate } from "./composer.ts";
import { shuffle } from "./misc.ts";
import { OutputError } from "./output.ts";
import {
  Settings as RawSettings,
  settings as globalSettings,
} from "./settings.ts";
import { loadCustomDictionary } from "./dictionary.ts";

export { OutputError };
export type { RedundancySettings } from "./settings.ts";

/**
 * Interface for configuring translation. See
 * https://github.com/ilo-token/ilo-token.github.io/wiki/Settings-Help for more
 * info.
 */
export type Settings = Partial<RawSettings>;

/** Translates Toki Pona text into multiple English translations. */
export function translate(
  tokiPona: string,
  settings?: undefined | null | Settings,
): Array<string> {
  if (settings != null) {
    globalSettings.setUnsavedAll(settings);
  }
  const output = rawTranslate(tokiPona).deduplicateErrors();
  if (!output.isError()) {
    const values = [...new Set(output.output)];
    if (globalSettings.get("randomize")) {
      shuffle(values);
    }
    return values;
  } else {
    let error: Array<OutputError> = [];
    if (globalSettings.get("use-telo-misikeke")) {
      error = errors(tokiPona).map((message) => {
        const error = new OutputError(message);
        error.htmlMessage = true;
        return error;
      });
    }
    if (error.length == 0) {
      error = output.errors;
    }
    throw new AggregateError(error);
  }
}
/** Updates internal dictionary. */
export function loadDictionary(dictionary: string): void {
  const errors = loadCustomDictionary(dictionary);
  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
