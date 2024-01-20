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
      } else this.error = null;
    } else if (output instanceof OutputError) {
      this.output = [];
      this.error = output;
    } else {
      this.output = [];
      this.error = new OutputError("no error provided");
    }
  }
  private setError(error: OutputError) {
    if (this.output.length === 0 && !this.error) this.error = error;
  }
  private push(value: T): void {
    this.output.push(value);
    this.error = null;
  }
  private append({ output, error }: Output<T>): void {
    this.output = [...this.output, ...output];
    if (this.output.length > 0) this.error = null;
    else this.error = error;
  }
  /** Returns true when the output array is empty */
  isError(): boolean {
    return this.output.length === 0;
  }
  filter(mapper: (value: T) => boolean): Output<T> {
    return this.map((value) => {
      if (mapper(value)) {
        return value;
      } else {
        throw new OutputError("no error provided");
      }
    });
  }
  /**
   * Maps all values and returns new Output. For convenience, the mapper
   * function can throw OutputError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): Output<U> {
    if (this.isError()) return new Output(this.error);
    const wholeOutput = new Output<U>();
    for (const value of this.output) {
      try {
        wholeOutput.push(mapper(value));
      } catch (error) {
        if (error instanceof OutputError) this.setError(error);
        else throw error;
      }
    }
    return wholeOutput;
  }
  /**
   * Accepts mapper function that returns another Output. flatMap takes all
   * values and flattens them into single array for Output.
   */
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) return new Output(this.error);
    const wholeOutput = new Output<U>();
    for (const value of this.output) wholeOutput.append(mapper(value));
    return wholeOutput;
  }
}
