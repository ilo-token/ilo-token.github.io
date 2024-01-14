import { OutputError } from "./error.ts";

/** Represents possibilities and error. */
export class Output<T> {
  /** Represents possibilities, considered error when the array is empty. */
  output: Array<T>;
  /**
   * An optional error, should be supplied if and only if the array is empty.
   */
  error: null | OutputError;
  constructor(output?: undefined | null | Array<T> | OutputError) {
    if (Array.isArray(output)) {
      this.output = output;
      if (output.length === 0) {
        this.error = new OutputError("no error provided");
      } else {
        this.error = null;
      }
    } else if (output instanceof OutputError) {
      this.output = [];
      this.error = output;
    } else {
      this.output = [];
      this.error = new OutputError("no error provided");
    }
  }
  private append({ output, error }: Output<T>): void {
    this.output = [...this.output, ...output];
    if (this.output.length > 0) {
      this.error = null;
    } else {
      this.error = error;
    }
  }
  isError(): boolean {
    return this.output.length === 0;
  }
  /**
   * Maps all values and returns new Output. For convenience, the mapper
   * function can throw OutputError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): Output<U> {
    return this.flatMap((value) => {
      try {
        return new Output([mapper(value)]);
      } catch (error) {
        if (error instanceof OutputError) {
          return new Output(error);
        } else {
          throw error;
        }
      }
    });
  }
  /**
   * Accepts mapper function that returns another Output. flatMap takes all
   * values and flattens them into single array for Output.
   */
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) {
      return new Output(this.error);
    }
    const wholeOutput = new Output<U>();
    for (const value of this.output) {
      wholeOutput.append(mapper(value));
    }
    return wholeOutput;
  }
}
