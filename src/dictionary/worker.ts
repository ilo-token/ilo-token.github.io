import { extractResultError, ResultError } from "../compound.ts";
import { parseDictionary } from "./parser.ts";

onmessage = (message) => {
  try {
    postMessage(parseDictionary(message.data as string));
  } catch (error) {
    let errors: ReadonlyArray<ResultError>;
    try {
      errors = extractResultError(error);
    } catch (error) {
      throw { type: "other", error };
    }
    throw {
      type: "positioned error",
      error: errors.map((error) => ({ ...error })),
    };
  }
};
