/** Module containing the Output data type. */

/** Represents Error used by Output. */
export class OutputError extends Error {
  /** Determines whether the error message contains HTML. */
  htmlMessage = false;
  constructor(message: string) {
    super(message);
    this.name = "OutputError";
  }
}
/** Represents possibilities and error. */
export class Output<T> {
  /** Represents possibilities, considered error when the array is empty. */
  readonly output: Array<T>;
  /** A list of all aggregated errors. */
  readonly errors: Array<OutputError> = [];
  constructor(output?: undefined | null | Array<T> | OutputError) {
    if (Array.isArray(output)) {
      this.output = output;
    } else if (output instanceof OutputError) {
      this.output = [];
      this.errors.push(output);
    } else {
      this.output = [];
    }
  }
  static newErrors<T>(errors: Array<OutputError>): Output<T> {
    const output = new Output<T>();
    for (const error of errors) {
      output.pushError(error);
    }
    return output;
  }
  private pushError(error: OutputError): void {
    if (this.isError()) {
      this.errors.push(error);
    }
  }
  private push(value: T): void {
    this.output.push(value);
    this.errors.length = 0;
  }
  private append(output: Output<T>): void {
    for (const item of output.output) {
      this.push(item);
    }
    if (this.isError() && output.isError()) {
      for (const item of output.errors) {
        this.pushError(item);
      }
    }
  }
  /** Returns true when the output array is empty */
  isError(): boolean {
    return this.output.length === 0;
  }
  /** Filters outputs. For convenience, the mapper function can throw
   * OutputError; Other kinds of errors will be ignored.
   */
  filter(mapper: (value: T) => boolean): Output<T> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    }
    const wholeOutput = new Output<T>();
    for (const value of this.output) {
      try {
        if (mapper(value)) {
          wholeOutput.push(value);
        }
      } catch (error) {
        if (error instanceof OutputError) {
          wholeOutput.pushError(error);
        } else {
          throw error;
        }
      }
    }
    return wholeOutput;
  }
  /**
   * Maps all values and returns new Output. For convenience, the mapper
   * function can throw OutputError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): Output<U> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    }
    const wholeOutput = new Output<U>();
    for (const value of this.output) {
      try {
        wholeOutput.push(mapper(value));
      } catch (error) {
        if (error instanceof OutputError) {
          wholeOutput.pushError(error);
        } else {
          throw error;
        }
      }
    }
    return wholeOutput;
  }
  /**
   * Accepts mapper function that returns another Output. flatMap takes all
   * values and flattens them into single array for Output.
   */
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    }
    const wholeOutput = new Output<U>();
    for (const value of this.output) wholeOutput.append(mapper(value));
    return wholeOutput;
  }
  filterMap<U>(mapper: (value: T) => U): Output<NonNullable<U>> {
    if (this.isError()) {
      return Output.newErrors(this.errors);
    }
    const wholeOutput = new Output<NonNullable<U>>();
    for (const value of this.output) {
      try {
        const newValue = mapper(value);
        if (newValue != null) {
          wholeOutput.push(newValue);
        }
      } catch (error) {
        if (error instanceof OutputError) {
          wholeOutput.pushError(error);
        } else {
          throw error;
        }
      }
    }
    return wholeOutput;
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
    const wholeOutput = new Output<U>();
    for (const output of outputs) {
      wholeOutput.append(output);
    }
    return wholeOutput;
  }
  /**
   * Combines all permutations of all Outputs into an Output of a single tuple
   * or array. If some of the Output is an error, all errors are aggregated.
   */
  static combine<T extends Array<unknown>>(
    ...outputs: { [I in keyof T]: Output<T[I]> } & { length: T["length"] }
  ): Output<T> {
    // We resorted to using `any` types here, make sure it works properly
    return outputs.reduce(
      (output: Output<any>, newOutput) => {
        if (output.isError() && newOutput.isError()) {
          return Output.concat(output, newOutput);
        } else if (output.isError()) {
          return Output.newErrors(output.errors);
        } else if (newOutput.isError()) {
          return Output.newErrors(newOutput.errors);
        } else {
          return output
            .flatMap((left) => newOutput.map((right) => [...left, right]));
        }
      },
      new Output<any>([[]]),
    ) as Output<T>;
  }
}
