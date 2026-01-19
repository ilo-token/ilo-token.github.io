import { extractResultError } from "../compound.ts";
import { type PositionedError } from "../parser/parser_lib.ts";
import { parseDictionary } from "./parser.ts";
import { type Dictionary } from "./type.ts";

onmessage = (message) => {
  let dictionary: Dictionary;
  try {
    dictionary = parseDictionary(message.data as string);
  } catch (error) {
    postMessage({
      type: "error",
      error: extractResultError(error)
        .map((error) => ({
          message: error.message,
          position: (error as PositionedError).position,
        })),
    });
    return;
  }
  postMessage({ type: "value", value: dictionary });
};
