import { errors } from "../telo-misikeke/telo-misikeke.js";
import { translate as rawTranslate } from "./composer.ts";
import { shuffle } from "./misc.ts";
import { OutputError } from "./output.ts";
import { settings } from "./settings.ts";
import { loadCustomDictionary } from "./dictionary.ts";

export { OutputError };

export function translate(input: string): Array<string> {
  const output = rawTranslate(input);
  if (!output.isError()) {
    const values = [...new Set(output.output)];
    if (settings.get("randomize")) {
      shuffle(values);
    }
    return values;
  } else {
    let error: Array<OutputError> = [];
    if (settings.get("use-telo-misikeke")) {
      error = errors(input).map((message) => {
        const error = new OutputError(message);
        error.htmlMessage = true;
        return error;
      });
    }
    if (error.length == 0) {
      const messages: Set<string> = new Set();
      error = output.errors.filter((error) => {
        if (messages.has(error.message)) {
          return false;
        } else {
          messages.add(error.message);
          return true;
        }
      });
    }
    throw new AggregateError(error);
  }
}
export function loadDictionary(dictionary: string): void {
  const errors = loadCustomDictionary(dictionary);
  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
