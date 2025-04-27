import { nullableAsArray } from "../misc/misc.ts";

export type ArrayResultOptions = {
  cause: unknown;
  isHtml: boolean;
};
export class ArrayResultError extends Error {
  isHtml: boolean;
  constructor(message: string, options: Partial<ArrayResultOptions> = {}) {
    super(message, { cause: options.cause });
    this.isHtml = options.isHtml ?? false;
    this.name = "ArrayResultError";
  }
}
export class TodoError extends ArrayResultError {
  constructor(functionality: string) {
    super(`${functionality} is not yet implemented`);
    this.name = "TodoError";
  }
}
export class ArrayResult<const T> {
  constructor(array?: ReadonlyArray<T>);
  constructor(array: undefined, errors: ReadonlyArray<ArrayResultError>);
  constructor(
    public readonly array: ReadonlyArray<T> = [],
    public readonly errors: ReadonlyArray<ArrayResultError> = [],
  ) {}
  static errors(errors: ReadonlyArray<ArrayResultError>): ArrayResult<never> {
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
  filterMap<const U>(mapper: (value: T) => U): ArrayResult<NonNullable<U>> {
    return this.flatMap((value) =>
      new ArrayResult(nullableAsArray(mapper(value)))
    );
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
  addErrorWhenNone(error: () => ArrayResultError): ArrayResult<T> {
    if (this.isError() && this.errors.length === 0) {
      return ArrayResult.errors([error()]);
    } else {
      return this;
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
  static combine<T extends ReadonlyArray<unknown>>(
    ...arrayResults:
      & Readonly<{ [I in keyof T]: ArrayResult<T[I]> }>
      & Readonly<{ length: T["length"] }>
  ): ArrayResult<T> {
    // we resorted to using `any` types here, make sure it works properly
    return arrayResults.reduce(
      (left: ArrayResult<any>, right) => {
        if (left.isError() && right.isError()) {
          return ArrayResult.concat(left, right);
        } else if (left.isError()) {
          return left;
        } else if (right.isError()) {
          return right;
        } else {
          return left.flatMap((left) => right.map((right) => [...left, right]));
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
export function extractArrayResultError(
  error: unknown,
): ReadonlyArray<ArrayResultError> {
  if (error instanceof ArrayResultError) {
    return [error];
  } else if (error instanceof AggregateError) {
    const { errors } = error;
    if (
      errors.length > 0 &&
      errors.every((error) => error instanceof ArrayResultError)
    ) {
      return errors;
    }
  }
  throw error;
}
