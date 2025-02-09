import { errors } from "../telo-misikeke/telo-misikeke.js";
import { translate as rawTranslate } from "./translator/composer.ts";
import { shuffle } from "./misc.ts";
import { OutputError } from "./output.ts";
import { Settings, settings as globalSettings } from "./settings.ts";

export { loadCustomDictionary } from "./dictionary.ts";
export { OutputError } from "./output.ts";
export type { OutputErrorOptions } from "./output.ts";
export type { RedundancySettings, Settings } from "./settings.ts";

/** Translates Toki Pona text into multiple English translations. */
export function translate(tokiPona: string): Array<string> {
  const output = rawTranslate(tokiPona);
  if (!output.isError()) {
    const values = [...new Set(output.output)];
    if (globalSettings.get("randomize")) {
      shuffle(values);
    }
    return values;
  } else {
    let error: ReadonlyArray<OutputError> = [];
    if (globalSettings.get("use-telo-misikeke")) {
      error = errors(tokiPona)
        .map((message) => new OutputError(message, { isHtml: true }));
    }
    if (error.length == 0) {
      error = output.deduplicateErrors().errors;
    }
    throw new AggregateError(error);
  }
}
/** Changes translation settings. */
export function setSettings(settings: Partial<Settings>): void {
  globalSettings.setAllUnsaved(settings);
}
/** resets settings to default. */
export function resetSettings(): void {
  globalSettings.resetUnsaved();
}
