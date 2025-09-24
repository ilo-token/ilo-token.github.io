// ensure this module don't have imports and as runtime agnostic as possible,
// make separate module when necessary

export function nullableAsArray<T>(
  value?: T,
): ReadonlyArray<NonNullable<T>> {
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
export function repeatArray<T>(
  value: T,
  count: number,
): ReadonlyArray<T> {
  return new Array(count).fill(value);
}
export function repeatWithSpace(text: string, count: number): string {
  return repeatArray(text, count).join(" ");
}
export function throwError(error: unknown): never {
  throw error;
}
export function compound(
  values: ReadonlyArray<string>,
  conjunction: string,
  repeat: boolean,
): string {
  if (repeat || values.length <= 2) {
    return values.join(` ${conjunction} `);
  } else {
    const lastIndex = values.length - 1;
    const init = values.slice(0, lastIndex);
    const last = values[lastIndex];
    const initText = init.map((item) => `${item},`).join(" ");
    return `${initText} ${conjunction} ${last}`;
  }
}
export function lazy<T>(fn: () => T): () => T {
  let defined = false;
  let value: T;
  return () => {
    if (!defined) {
      defined = true;
      value = fn();
    }
    return value!;
  };
}
