/** Module containing the Array Result data type. */

import { flattenError } from "./misc.ts";

export type ArrayResultOptions = {
  cause: unknown;
  isHtml: boolean;
};
/** Represents Error used by Array Result. */
export class ArrayResultError extends Error {
  /** Determines whether the error message contains HTML. */
  isHtml: boolean;
  constructor(message: string, options: Partial<ArrayResultOptions> = {}) {
    super(message, { cause: options.cause });
    this.isHtml = options.isHtml ?? false;
    this.name = "ArrayResultError";
  }
}
/** Represents Error due to things not implemented yet. */
export class TodoError extends ArrayResultError {
  constructor(functionality: string) {
    super(`${functionality} is not yet implemented`);
    this.name = "TodoError";
  }
}
/** Represents possibilities and error. */
export class ArrayResult<T> {
  /** Represents possibilities, considered error when the array is empty. */
  readonly array: ReadonlyArray<T>;
  /** A list of all aggregated errors. */
  readonly errors: ReadonlyArray<ArrayResultError>;
  constructor(array?: ReadonlyArray<T> | ArrayResultError);
  constructor(array: undefined, errors: ReadonlyArray<ArrayResultError>);
  constructor(
    array: ReadonlyArray<T> | ArrayResultError = [],
    errors: ReadonlyArray<ArrayResultError> = [],
  ) {
    if (Array.isArray(array)) {
      this.array = array;
    } else {
      this.array = [];
    }
    if (this.array.length === 0) {
      if (array instanceof ArrayResultError) {
        this.errors = [array];
      } else {
        this.errors = errors;
      }
    } else {
      this.errors = [];
    }
  }
  static errors(errors: ReadonlyArray<ArrayResultError>): ArrayResult<never> {
    return new ArrayResult(undefined, errors);
  }
  /** Returns true when the array is empty */
  isError(): boolean {
    return this.array.length === 0;
  }
  /** Filters array. For convenience, the mapper function can throw
   * ArrayResultError; Other kinds of errors will be ignored.
   */
  filter(mapper: (value: T) => boolean): ArrayResult<T> {
    return this.flatMap((value) => {
      if (mapper(value)) {
        return new ArrayResult([value]);
      } else {
        return new ArrayResult();
      }
    });
  }
  /**
   * Maps all values and returns new ArrayResult. For convenience, the mapper
   * function can throw ArrayResultError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): ArrayResult<U> {
    return this.flatMap((value) => new ArrayResult([mapper(value)]));
  }
  /**
   * Accepts mapper function that returns another ArrayResult. flatMap takes all
   * values and flattens them into single array for ArrayResult. For convenience,
   * the mapper function can throw ArrayResultError; Other kinds of errors will be
   * ignored.
   */
  flatMap<U>(mapper: (value: T) => ArrayResult<U>): ArrayResult<U> {
    if (this.isError()) {
      return this as unknown as ArrayResult<U>;
    } else {
      return this.array.reduce(
        (rest, value) =>
          ArrayResult.concat(rest, ArrayResult.from(() => mapper(value))),
        new ArrayResult<U>(),
      );
    }
  }
  filterMap<U>(mapper: (value: T) => U): ArrayResult<NonNullable<U>> {
    return this.flatMap((value) => {
      const arrayResult = mapper(value);
      if (arrayResult == null) {
        return new ArrayResult();
      } else {
        return new ArrayResult([arrayResult]);
      }
    });
  }
  sort(comparer: (left: T, right: T) => number): ArrayResult<T> {
    if (this.isError()) {
      return this;
    } else {
      return new ArrayResult([...this.array].sort(comparer));
    }
  }
  sortBy(mapper: (value: T) => number): ArrayResult<T> {
    return this.sort((left, right) => mapper(left) - mapper(right));
  }
  deduplicateErrors(): ArrayResult<T> {
    if (this.isError()) {
      const messages: Set<string> = new Set();
      return ArrayResult.errors(this.errors.filter((error) => {
        if (messages.has(error.message)) {
          return false;
        } else {
          messages.add(error.message);
          return true;
        }
      }));
    } else {
      return this;
    }
  }
  addErrorWhenNone(error: () => ArrayResultError): ArrayResult<T> {
    if (this.isError() && this.errors.length === 0) {
      return new ArrayResult(error());
    } else {
      return this;
    }
  }
  /** Combines all ArrayResult. */
  static concat<T>(...arrayResults: Array<ArrayResult<T>>): ArrayResult<T> {
    return arrayResults.reduce(
      (left, right) => {
        if (left.isError() && right.isError()) {
          return ArrayResult.errors([...left.errors, ...right.errors]);
        } else {
          return new ArrayResult([...left.array, ...right.array]);
        }
      },
      new ArrayResult<T>(),
    );
  }
  /**
   * Combines all permutations of all ArrayResult into an ArrayResult of a single tuple
   * or array. If some of the ArrayResult is an error, all errors are aggregated.
   */
  static combine<T extends Array<unknown>>(
    ...arrayResults: { [I in keyof T]: ArrayResult<T[I]> } & {
      length: T["length"];
    }
  ): ArrayResult<T> {
    // We resorted to using `any` types here, make sure it works properly
    return arrayResults.reduce(
      (left: ArrayResult<any>, right) => {
        if (left.isError() && right.isError()) {
          return ArrayResult.concat(left, right);
        } else if (left.isError()) {
          return ArrayResult.errors(left.errors);
        } else if (right.isError()) {
          return ArrayResult.errors(right.errors);
        } else {
          return left
            .flatMap((left) => right.map((right) => [...left, right]));
        }
      },
      new ArrayResult<any>([[]]),
    ) as ArrayResult<T>;
  }
  static from<T>(arrayResult: () => ArrayResult<T>): ArrayResult<T> {
    try {
      return arrayResult();
    } catch (error) {
      return ArrayResult.errors(extractArrayResultError(error));
    }
  }
}
type Errors =
  | { type: "array result"; errors: Array<ArrayResultError> }
  | { type: "outside"; errors: Array<unknown> };
function extractArrayResultError(error: unknown): Array<ArrayResultError> {
  const errors = flattenError(error).reduce<Errors>(
    (errors, error) => {
      switch (errors.type) {
        case "array result":
          if (error instanceof ArrayResultError) {
            return { type: "array result", errors: [...errors.errors, error] };
          } else {
            return { type: "outside", errors: [error] };
          }
        case "outside": {
          let moreError: Array<unknown>;
          if (error instanceof ArrayResultError) {
            moreError = [];
          } else {
            moreError = [error];
          }
          return { type: "outside", errors: [...errors.errors, ...moreError] };
        }
      }
    },
    {
      type: "array result",
      errors: [],
    },
  );
  switch (errors.type) {
    case "array result":
      return errors.errors;
    case "outside":
      if (errors.errors.length === 1) {
        throw errors.errors[0];
      } else {
        throw new AggregateError(errors.errors);
      }
  }
}
