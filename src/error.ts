/** Module for Error datatypes. */

import { OutputError } from "output-parser/output.ts";

/** Represents Error with unexpected and expected elements. */
export class UnexpectedError extends OutputError {
  constructor(unexpected: string, expected: string) {
    super(`Unexpected ${unexpected}. ${expected} were expected instead.`);
  }
}
/** Represents Error due to things not implemented yet. */
export class TodoError extends OutputError {
  constructor(token: string) {
    super(`${token} is not yet implemented.`);
  }
}
/** Represents Error caused by unrecognized elements. */
export class UnrecognizedError extends OutputError {
  constructor(token: string) {
    super(`${token} is unrecognized.`);
  }
}
