/** Represents Error used by `Output`. */
export class OutputError extends Error {}
/**
 * Represents errors that cannot be seen. This includes errors expected to be
 * unreached as well as errors expected to be covered by non-error outputs.
 */
export class UnreachableError extends OutputError {
  constructor() {
    super("This is an error you shouldn't see... Please report this error.");
  }
}
/** Represents Error caused by unrecognized elements. */
export class UnrecognizedError extends OutputError {
  constructor(token: string) {
    super(`${token} is unrecognized.`);
  }
}
