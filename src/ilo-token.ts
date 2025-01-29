import { errors } from "../telo-misikeke/telo-misikeke.js";
import { translate as rawTranslate } from "./composer.ts";
import { shuffle } from "./misc.ts";
import { OutputError } from "./output.ts";
import { settings } from "./settings.ts";

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
      error = output.errors;
    }
    throw new AggregateError(error);
  }
}
