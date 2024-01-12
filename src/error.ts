export class UnreachableError extends Error {
  constructor() {
    super("This is an error you shouldn't see... Please report this error.");
  }
}
export class UnrecognizedError extends Error {
  constructor(token) {
    super(`${token} is unrecognized`);
  }
}
