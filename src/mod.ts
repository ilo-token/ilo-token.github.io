import { errors } from "../telo-misikeke/telo-misikeke.js";
import { translate as rawTranslate } from "./translator/composer.ts";
import { OutputError } from "./output.ts";
import { settings } from "./settings.ts";
import { shuffle } from "@std/random/shuffle";

export { loadCustomDictionary } from "./dictionary.ts";
export { OutputError } from "./output.ts";
export { defaultSettings, settings } from "./settings.ts";
export type { OutputErrorOptions } from "./output.ts";
export type { RedundancySettings, Settings } from "./settings.ts";

/** Translates Toki Pona text into multiple English translations. */
export function translate(tokiPona: string): Array<string> {
  const output = rawTranslate(tokiPona);
  if (!output.isError()) {
    const values = [...new Set(output.output)];
    if (settings.randomize) {
      return shuffle(values);
    } else {
      return values;
    }
  } else {
    let error: ReadonlyArray<OutputError> = [];
    if (settings.teloMisikeke) {
      error = errors(tokiPona)
        .map((message) => new OutputError(message, { isHtml: true }));
    }
    if (error.length == 0) {
      error = output.deduplicateErrors().errors;
    }
    throw new AggregateError(error);
  }
}
