/** Module containing the Output data type. */

/** */
export type OutputErrorOptions = {
  cause: unknown;
  isHtml: boolean;
};
/** Represents Error used by Output. */
export class OutputError extends Error {
  /** Determines whether the error message contains HTML. */
  isHtml: boolean;
  constructor(message: string, options: Partial<OutputErrorOptions> = {}) {
    super(message, { cause: options.cause });
    this.isHtml = options.isHtml ?? false;
    this.name = "OutputError";
  }
}
/** Represents Error due to things not implemented yet. */
export class TodoError extends OutputError {
  constructor(token: string) {
    super(`${token} is not yet implemented`);
    this.name = "TodoError";
  }
}
/** Represents possibilities and error. */
export class Output<T> {
  /** Represents possibilities, considered error when the array is empty. */
  readonly output: ReadonlyArray<T>;
  /** A list of all aggregated errors. */
  readonly errors: ReadonlyArray<OutputError>;
  constructor(
    output?: ReadonlyArray<T> | OutputError,
    errors: ReadonlyArray<OutputError> = [],
  ) {
    if (Array.isArray(output)) {
      this.output = output;
      this.errors = [];
    } else if (output instanceof OutputError) {
      this.output = [];
      this.errors = [output];
    } else {
      this.output = [];
      this.errors = errors;
    }
  }
  static newErrors<T>(errors: ReadonlyArray<OutputError>): Output<T> {
    return new Output(undefined, errors);
  }
  /** Returns true when the output array is empty */
  isError(): boolean {
    return this.output.length === 0;
  }
  /** Filters outputs. For convenience, the mapper function can throw
   * OutputError; Other kinds of errors will be ignored.
   */
  filter(mapper: (value: T) => boolean): Output<T> {
    return this.flatMap((value) => {
      if (mapper(value)) {
        return new Output([value]);
      } else {
        return new Output();
      }
    });
  }
  /**
   * Maps all values and returns new Output. For convenience, the mapper
   * function can throw OutputError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): Output<U> {
    return this.flatMap((value) => new Output([mapper(value)]));
  }
  /**
   * Accepts mapper function that returns another Output. flatMap takes all
   * values and flattens them into single array for Output. For convenience,
   * the mapper function can throw OutputError; Other kinds of errors will be
   * ignored.
   */
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    } else {
      return this.output.reduce(
        (rest, value) => {
          let output: Output<U>;
          try {
            output = mapper(value);
          } catch (error) {
            if (error instanceof OutputError) {
              output = new Output(error);
            } else {
              throw error;
            }
          }
          return Output.concat(rest, output);
        },
        new Output<U>(),
      );
    }
  }
  filterMap<U>(mapper: (value: T) => U): Output<NonNullable<U>> {
    return this.flatMap((value) => {
      const output = mapper(value);
      if (output == null) {
        return new Output();
      } else {
        return new Output([output]);
      }
    });
  }
  sort(comparer: (left: T, right: T) => number): Output<T> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    } else {
      return new Output(this.output.slice().sort(comparer));
    }
  }
  sortBy(mapper: (value: T) => number): Output<T> {
    return this.sort((left, right) => mapper(left) - mapper(right));
  }
  deduplicateErrors(): Output<T> {
    if (this.isError()) {
      const messages: Set<string> = new Set();
      return Output.newErrors(this.errors.filter((error) => {
        if (messages.has(error.message)) {
          return false;
        } else {
          messages.add(error.message);
          return true;
        }
      }));
    } else {
      return new Output(this.output);
    }
  }
  /** Combines all outputs. */
  static concat<U>(...outputs: Array<Output<U>>): Output<U> {
    return outputs.reduce((left, right) => {
      if (left.isError() || right.isError()) {
        return Output.newErrors([...left.errors, ...right.errors]);
      } else {
        return new Output([...left.output, ...right.output]);
      }
    }, new Output<U>());
  }
  /**
   * Combines all permutations of all Outputs into an Output of a single tuple
   * or array. If some of the Output is an error, all errors are aggregated.
   */
  static combine<T extends Array<unknown>>(
    ...outputs: { [I in keyof T]: Output<T[I]> } & { length: T["length"] }
  ): Output<T> {
    // We resorted to using `any` types here, make sure it works properly
    return outputs.reduce((left: Output<any>, right) => {
      if (left.isError() && right.isError()) {
        return Output.concat(left, right);
      } else if (left.isError()) {
        return Output.newErrors(left.errors);
      } else if (right.isError()) {
        return Output.newErrors(right.errors);
      } else {
        return left
          .flatMap((left) => right.map((right) => [...left, right]));
      }
    }, new Output<any>([[]])) as Output<T>;
  }
}
