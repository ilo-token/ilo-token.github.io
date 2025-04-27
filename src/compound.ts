export type ArrayResultOptions = {
  cause: unknown;
  isHtml: boolean;
};
export class ResultError extends Error {
  isHtml: boolean;
  override name = "ArrayResultError";
  constructor(message: string, options: Partial<ArrayResultOptions> = {}) {
    super(message, { cause: options.cause });
    this.isHtml = options.isHtml ?? false;
  }
}
export class TodoError extends ResultError {
  override name = "TodoError";
  constructor(functionality: string) {
    super(`${functionality} is not yet implemented`);
  }
}
export class ArrayResult<const T> {
  constructor(array?: ReadonlyArray<T>);
  constructor(array: undefined, errors: ReadonlyArray<ResultError>);
  constructor(
    public readonly array: ReadonlyArray<T> = [],
    public readonly errors: ReadonlyArray<ResultError> = [],
  ) {}
  static errors(errors: ReadonlyArray<ResultError>): ArrayResult<never> {
    return new ArrayResult(undefined, errors);
  }
  static empty(): ArrayResult<never> {
    return new ArrayResult();
  }
  isError(): boolean {
    return this.array.length === 0;
  }
  unwrap(): ReadonlyArray<T> {
    if (this.isError()) {
      throw new AggregateError(this.errors);
    } else {
      return this.array;
    }
  }
  filter(mapper: (value: T) => boolean): ArrayResult<T> {
    return this.flatMap((value) =>
      mapper(value) ? new ArrayResult([value]) : ArrayResult.empty()
    );
  }
  map<const U>(mapper: (value: T) => U): ArrayResult<U> {
    return this.flatMap((value) => new ArrayResult([mapper(value)]));
  }
  flatMap<const U>(mapper: (value: T) => ArrayResult<U>): ArrayResult<U> {
    if (this.isError()) {
      return this as unknown as ArrayResult<U>;
    } else {
      return this.array.reduce(
        (rest, value) =>
          ArrayResult.concat(rest, ArrayResult.from(() => mapper(value))),
        ArrayResult.empty() as ArrayResult<U>,
      );
    }
  }
  // filterMap<const U>(mapper: (value: T) => U): ArrayResult<NonNullable<U>> {
  //   return this.flatMap((value) =>
  //     new ArrayResult(nullableAsArray(mapper(value)))
  //   );
  // }
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
  // addErrorWhenNone(error: () => ResultError): ArrayResult<T> {
  //   if (this.isError() && this.errors.length === 0) {
  //     return ArrayResult.errors([error()]);
  //   } else {
  //     return this;
  //   }
  // }
  asIterableResult(): IterableResult<T> {
    if (this.isError()) {
      return IterableResult.errors(this.errors);
    } else {
      return IterableResult.fromArray(this.unwrap());
    }
  }
  static concat<T>(
    ...arrayResults: ReadonlyArray<ArrayResult<T>>
  ): ArrayResult<T> {
    return arrayResults.reduce(
      (left, right) =>
        left.isError() && right.isError()
          ? ArrayResult.errors([...left.errors, ...right.errors])
          : new ArrayResult([...left.array, ...right.array]),
      ArrayResult.empty(),
    );
  }
  // static combine<T extends ReadonlyArray<unknown>>(
  //   ...arrayResults:
  //     & Readonly<{ [I in keyof T]: ArrayResult<T[I]> }>
  //     & Readonly<{ length: T["length"] }>
  // ): ArrayResult<T> {
  //   // we resorted to using `any` types here, make sure it works properly
  //   return arrayResults.reduce(
  //     (left: ArrayResult<any>, right) => {
  //       if (left.isError() && right.isError()) {
  //         return ArrayResult.concat(left, right);
  //       } else if (left.isError()) {
  //         return left;
  //       } else if (right.isError()) {
  //         return right;
  //       } else {
  //         return left.flatMap((left) => right.map((right) => [...left, right]));
  //       }
  //     },
  //     new ArrayResult<any>([[]]),
  //   ) as ArrayResult<T>;
  // }
  static from<T>(arrayResult: () => ArrayResult<T>): ArrayResult<T> {
    try {
      return arrayResult();
    } catch (error) {
      return ArrayResult.errors(extractResultError(error));
    }
  }
}
export type Result<T> =
  | Readonly<{ type: "value"; value: T }>
  | Readonly<{ type: "error"; error: ResultError }>;

export class IterableResult<const T> {
  constructor(public readonly iterable: () => Generator<Result<T>>) {}
  static fromArray<const T>(array: ReadonlyArray<T>): IterableResult<T> {
    return new IterableResult(function* () {
      for (const value of array) {
        yield { type: "value", value };
      }
    });
  }
  static single<const T>(value: T): IterableResult<T> {
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
  collect(): ReadonlyArray<T> {
    const array: Array<T> = [];
    const error: Array<ResultError> = [];
    for (const result of this.iterable()) {
      switch (result.type) {
        case "value":
          array.push(result.value);
          break;
        case "error":
          error.push(result.error);
          break;
      }
    }
    if (error.length > 0) {
      throw new AggregateError(error);
    } else {
      return array;
    }
  }
  filter(mapper: (value: T) => boolean): IterableResult<T> {
    return this.flatMap((value) =>
      mapper(value) ? IterableResult.single(value) : IterableResult.empty()
    );
  }
  map<const U>(mapper: (value: T) => U): IterableResult<U> {
    return this.flatMap((value) => IterableResult.single(mapper(value)));
  }
  flatMap<const U>(mapper: (value: T) => IterableResult<U>): IterableResult<U> {
    const iterable = this.iterable;
    return new IterableResult(function* () {
      const errors: Array<ResultError> = [];
      let yielded = false;
      for (const result of iterable()) {
        switch (result.type) {
          case "value": {
            const more = IterableResult.from(() => mapper(result.value));
            for (const result of more.iterable()) {
              switch (result.type) {
                case "value":
                  yielded = false;
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
          yield { type: "error", error } as const;
        }
      }
    });
  }
  filterMap<const U>(mapper: (value: T) => U): IterableResult<NonNullable<U>> {
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
    const iterable = this.iterable;
    return new IterableResult(function* () {
      let yielded = false;
      for (const result of iterable()) {
        yielded = true;
        yield result;
      }
      if (!yielded) {
        yield { type: "error", error: error() };
      }
    });
  }
  static concat<T>(
    ...iterableResults: ReadonlyArray<IterableResult<T>>
  ): IterableResult<T> {
    return new IterableResult(function* () {
      const errors: Array<ResultError> = [];
      let yielded = false;
      for (const iterable of iterableResults) {
        for (const result of iterable.iterable()) {
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
          yield { type: "error", error } as const;
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
          for (const leftResult of left.iterable()) {
            switch (leftResult.type) {
              case "value":
                if (rightAggregate == null) {
                  rightAggregate = [];
                  for (const rightResult of right.iterable()) {
                    switch (rightResult.type) {
                      case "value": {
                        const right = rightResult.value;
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
            for (const result of right.iterable()) {
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
