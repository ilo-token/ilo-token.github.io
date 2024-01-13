import { OutputError } from "./error.ts";

export class Output<T> {
  output: Array<T>;
  error: null | OutputError;
  constructor(output?: Array<T> | OutputError) {
    if (Array.isArray(output)) {
      this.output = output;
      this.error = null;
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
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) {
      if (this.error) {
        return new Output(this.error);
      } else {
        return new Output(new OutputError());
      }
    }
    const wholeOutput = new Output<U>(new OutputError());
    for (const value of this.output) {
      wholeOutput.append(mapper(value));
    }
    return wholeOutput;
  }
}
