export class Output<T> {
  output: Array<T>;
  error: null | Error;
  constructor(output: Array<T> | Error) {
    if (Array.isArray(output)) {
      this.output = output;
      this.error = null;
    } else if (output instanceof Error) {
      this.output = [];
      this.error = output;
    } else {
      throw new Error("passed not array nor error");
    }
  }
  push(output: T): void {
    this.output.push(output);
    this.error = null;
  }
  append({ output, error }: Output<T>): void {
    this.output = [...this.output, ...output];
    if (this.output.length > 0) {
      this.error = null;
    } else {
      this.error = error;
    }
  }
  setError(error: null | Error): void {
    if (!this.error && this.output.length === 0) {
      this.error = error;
    }
  }
  isError(): boolean {
    return this.output.length === 0;
  }
  map<U>(mapper: (value: T) => U): Output<U> {
    return new Output(this.output.map(mapper));
  }
  flatMap<U>(mapper: (value: T) => Output<U>): Output<U> {
    if (this.isError()) {
      if (this.error) {
        return new Output(this.error);
      } else {
        return new Output([]);
      }
    }
    const wholeOutput = new Output<U>([]);
    for (const value of this.output) {
      wholeOutput.append(mapper(value));
    }
    return wholeOutput;
  }
}
