/** Represents Error used by `Output`. */
export class OutputError extends Error {}
/** Represents errors that cannot be reached. */
export class UnreachableError extends Error {
  constructor() {
    super("This is an error you shouldn't see... Please report this error.");
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
