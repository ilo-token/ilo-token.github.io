import { extractResultError, type ResultError } from "../compound.ts";
import { type PositionedError } from "../parser/parser_lib.ts";
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
      type: "result error",
      error: errors.map((error) => ({
        message: error.message,
        position: (error as PositionedError).position,
      })),
    };
  }
};
