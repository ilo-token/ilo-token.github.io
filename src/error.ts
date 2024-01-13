export class OutputError extends Error {}
export class UnreachableError extends OutputError {
  constructor() {
    super("This is an error you shouldn't see... Please report this error.");
  }
}
export class UnrecognizedError extends OutputError {
  constructor(token: string) {
    super(`${token} is unrecognized.`);
  }
}
