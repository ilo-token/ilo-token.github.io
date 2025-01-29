/** Module for Error datatypes. */

import { fs } from "./misc.ts";
import { OutputError } from "./output.ts";

/** Represents Error with unexpected and expected elements. */
export class UnexpectedError extends OutputError {
  constructor(unexpected: string, expected: string) {
    super(fs`unexpected ${unexpected}. ${expected} were expected instead`);
    this.name = "UnexpectedError";
  }
}
/** Represents Error due to things not implemented yet. */
export class TodoError extends OutputError {
  constructor(token: string) {
    super(fs`${token} is not yet implemented`);
    this.name = "TodoError";
  }
}
/** Represents Error caused by unrecognized elements. */
export class UnrecognizedError extends OutputError {
  constructor(token: string) {
    super(fs`${token} is unrecognized`);
    this.name = "UnrecognizedError";
  }
}
/** Represents Error due to missing dictionary entry */
export class MissingEntryError extends OutputError {
  constructor(definition: string, word: string) {
    super(fs`${definition} for the word "${word}" is missing`);
    this.name = "MissingEntryError";
  }
}
