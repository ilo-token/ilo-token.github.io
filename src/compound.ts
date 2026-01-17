export class ResultError extends Error {
  override name = "ArrayResultError";
}
export class TodoError extends ResultError {
  override name = "TodoError";
  constructor(functionality: string) {
    super(`${functionality} is not yet implemented`);
  }
}
export type Result<T> =
  | Readonly<{ type: "value"; value: T }>
  | Readonly<{ type: "error"; error: ResultError }>;

export class IterableResult<T> {
  #evaluated: Array<Result<T>> = [];
  #iterator: Iterator<Result<T>>;
  constructor(generator: () => Iterator<Result<T>>) {
    this.#iterator = generator();
  }
  *[Symbol.iterator](): Iterator<Result<T>> {
    yield* this.#evaluated;
    while (true) {
      const result = this.#iterator.next();
      if (result.done) break;
      this.#evaluated.push(result.value);
      yield result.value;
    }
  }
  static fromArray<T>(array: ReadonlyArray<T>): IterableResult<T> {
    return new IterableResult(function* () {
      for (const value of array) {
        yield { type: "value", value };
      }
    });
  }
  static fromNullable<T>(value?: T): IterableResult<NonNullable<T>> {
    return new IterableResult(function* () {
      if (value != null) {
        yield { type: "value", value };
      }
    });
  }
  static single<T>(value: T): IterableResult<T> {
    return new IterableResult(function* () {
      yield { type: "value", value };
    });
  }
  static errors(errors: ReadonlyArray<ResultError>): IterableResult<never> {
    return new IterableResult(function* () {
      for (const error of errors) {
        yield { type: "error", error };
      }
    });
  }
  static empty(): IterableResult<never> {
    return new IterableResult(function* () {});
  }
  isError(): boolean {
    const peeked = this[Symbol.iterator]().next();
    return peeked.done || peeked.value.type === "error";
  }
  collect(): ReadonlyArray<T> {
    const array: Array<T> = [];
    const errors: Array<ResultError> = [];
    for (const result of this) {
      switch (result.type) {
        case "value":
          array.push(result.value);
          break;
        case "error":
          errors.push(result.error);
          break;
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors);
    } else {
      return array;
    }
  }
  filter(mapper: (value: T) => boolean): IterableResult<T> {
    return this.flatMap((value) =>
      mapper(value) ? IterableResult.single(value) : IterableResult.empty()
    );
  }
  map<U>(mapper: (value: T) => U): IterableResult<U> {
    return this.flatMap((value) => IterableResult.single(mapper(value)));
  }
  flatMap<U>(mapper: (value: T) => IterableResult<U>): IterableResult<U> {
    return new IterableResult(
      function* (this: IterableResult<T>): Generator<Result<U>> {
        const errors: Array<ResultError> = [];
        let yielded = false;
        for (const result of this) {
          switch (result.type) {
            case "value": {
              const more = IterableResult.from(() => mapper(result.value));
              for (const result of more) {
                switch (result.type) {
                  case "value":
                    yielded = true;
                    yield result;
                    break;
                  case "error":
                    errors.push(result.error);
                }
              }
              break;
            }
            case "error":
              yield result;
          }
        }
        if (!yielded) {
          for (const error of errors) {
            yield { type: "error", error };
          }
        }
      }
        .bind(this),
    );
  }
  sort(comparer: (left: T, right: T) => number): IterableResult<T> {
    return new IterableResult(
      function* (this: IterableResult<T>) {
        let hasError = false;
        const array: Array<T> = [];
        for (const result of this) {
          switch (result.type) {
            case "value":
              array.push(result.value);
              break;
            case "error":
              hasError = true;
              yield result;
              break;
          }
        }
        if (!hasError) {
          const sorted = array.toSorted(comparer);
          for (const value of sorted) {
            yield { type: "value" as const, value };
          }
        }
      }
        .bind(this),
    );
  }
  filterMap<U>(mapper: (value: T) => U): IterableResult<NonNullable<U>> {
    return this.flatMap((value) => {
      const newValue = mapper(value);
      if (newValue == null) {
        return IterableResult.empty();
      } else {
        return IterableResult.single(newValue);
      }
    });
  }
  addErrorWhenNone(error: () => ResultError): IterableResult<T> {
    return new IterableResult(
      function* (this: IterableResult<T>): Generator<Result<T>> {
        let yielded = false;
        for (const result of this) {
          yielded = true;
          yield result;
        }
        if (!yielded) {
          yield { type: "error", error: error() };
        }
      }
        .bind(this),
    );
  }
  static concat<T>(
    ...iterableResults: ReadonlyArray<IterableResult<T>>
  ): IterableResult<T> {
    return new IterableResult(function* () {
      const errors: Array<ResultError> = [];
      let yielded = false;
      for (const iterable of iterableResults) {
        for (const result of iterable) {
          switch (result.type) {
            case "value":
              yielded = true;
              yield result;
              break;
            case "error":
              errors.push(result.error);
              break;
          }
        }
      }
      if (!yielded) {
        for (const error of errors) {
          yield { type: "error", error };
        }
      }
    });
  }
  static combine<T extends ReadonlyArray<unknown>>(
    ...iterableResults:
      & Readonly<{ [I in keyof T]: IterableResult<T[I]> }>
      & Readonly<{ length: T["length"] }>
  ): IterableResult<T> {
    // we resorted to using `any` types here, make sure it works properly
    return iterableResults.reduce(
      (left: IterableResult<any>, right) =>
        new IterableResult(function* () {
          let rightAggregate: null | Array<any> = null;
          let yielded = false;
          for (const leftResult of left) {
            switch (leftResult.type) {
              case "value":
                if (rightAggregate == null) {
                  rightAggregate = [];
                  for (const rightResult of right) {
                    switch (rightResult.type) {
                      case "value": {
                        const { value: right } = rightResult;
                        rightAggregate.push(right);
                        yielded = true;
                        yield {
                          type: "value",
                          value: [...leftResult.value, right],
                        };
                        break;
                      }
                      case "error":
                        yield rightResult;
                        break;
                    }
                  }
                } else {
                  for (const right of rightAggregate) {
                    yielded = true;
                    yield {
                      type: "value",
                      value: [...leftResult.value, right],
                    };
                  }
                }
                break;
              case "error":
                yield leftResult;
                break;
            }
          }
          if (!yielded && rightAggregate == null) {
            for (const result of right) {
              if (result.type === "error") {
                yield result;
              }
            }
          }
        }),
      IterableResult.single([]) as IterableResult<any>,
    ) as IterableResult<T>;
  }
  static from<T>(iterableResult: () => IterableResult<T>): IterableResult<T> {
    try {
      return iterableResult();
    } catch (error) {
      return IterableResult.errors(extractResultError(error));
    }
  }
}
export function extractResultError(
  error: unknown,
): ReadonlyArray<ResultError> {
  if (error instanceof ResultError) {
    return [error];
  } else if (error instanceof AggregateError) {
    const { errors } = error;
    if (
      errors.length > 0 &&
      errors.every((error) => error instanceof ResultError)
    ) {
      return errors;
    }
  }
  throw error;
}
