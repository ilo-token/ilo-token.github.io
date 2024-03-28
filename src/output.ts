/** Module containing the Output data type. */

import { OutputError } from "./error.ts";
/** Represents possibilities and error. */
export class Output<T> {
  /** Represents possibilities, considered error when the array is empty. */
  output: Array<T>;
  /** A list of all aggregated errors. */
  errors: Array<OutputError> = [];
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
  private static newErrors<T>(errors: Array<OutputError>): Output<T> {
    const output = new Output<T>();
    output.errors = errors;
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
  /**
   * Filters outputs. Instead of returning false, OutputError must be thrown
   * instead.
   */
  filter(mapper: (value: T) => boolean): Output<T> {
    return this.map((value) => {
      if (mapper(value)) {
        return value;
      } else {
        throw new Error("no error provided");
      }
    });
  }
  /**
   * Maps all values and returns new Output. For convenience, the mapper
   * function can throw OutputError; Other kinds of errors will be ignored.
   */
  map<U>(mapper: (value: T) => U): Output<U> {
    if (this.isError()) {
      return Output.newErrors(this.errors.slice());
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
      return Output.newErrors(this.errors.slice());
    }
    const wholeOutput = new Output<U>();
    for (const value of this.output) wholeOutput.append(mapper(value));
    return wholeOutput;
  }
  /** Combines all outputs. */
  static concat<U>(...outputs: Array<Output<U>>): Output<U> {
    const wholeOutput = new Output<U>();
    for (const output of outputs) {
      wholeOutput.append(output);
    }
    return wholeOutput;
  }
}
