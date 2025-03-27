export function nullableAsArray<T>(value?: T): ReadonlyArray<NonNullable<T>> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
export function mapNullable<T, U>(
  value: T,
  mapper: (value: NonNullable<T>) => U,
): null | U {
  if (value == null) {
    return null;
  } else {
    return mapper(value);
  }
}
export function repeatArray<T>(element: T, count: number): ReadonlyArray<T> {
  return new Array(count).fill(element);
}
export function repeatWithSpace(text: string, count: number): string {
  return repeatArray(text, count).join(" ");
}
export function flattenError(error: unknown): ReadonlyArray<unknown> {
  if (error instanceof AggregateError) {
    return error.errors.flatMap(flattenError);
  } else {
    return [error];
  }
}
export function throwError(error: unknown): never {
  throw error;
}
